import { NextRequest, NextResponse } from 'next/server'
import { renovarAccessTokenSeNecessario } from '@/lib/google-calendar'
import { supabase } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  try {
    // 1. Obter integração ativa do Google Calendar
    const { data: integracoes, error: errInt } = await supabase
      .from('integracoes_google')
      .select('*')
      .eq('ativo', true)
      .order('atualizado_em', { ascending: false })
      .limit(1)

    if (errInt || !integracoes || integracoes.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma conta Google conectada. Clique em "Conectar Google Agenda".' },
        { status: 400 }
      )
    }

    const integracao = integracoes[0]
    const accessToken = await renovarAccessTokenSeNecessario(integracao)

    // 2. PUXAR (PULL) eventos do Google Calendar para o Familia OS
    // Pegar eventos dos últimos 30 dias até os próximos 90 dias
    const agora = new Date()
    const timeMin = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const timeMax = new Date(agora.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const urlGoogleEvents = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`

    const resGoogle = await fetch(urlGoogleEvents, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const dataGoogle = await resGoogle.json()
    if (!resGoogle.ok) {
      throw new Error(dataGoogle.error?.message || 'Erro ao consultar Google Calendar API.')
    }

    const eventosGoogle = dataGoogle.items || []
    let contadorPuxados = 0

    for (const gEvent of eventosGoogle) {
      if (!gEvent.summary || gEvent.status === 'cancelled') continue

      const inicioStr = gEvent.start?.dateTime || gEvent.start?.date
      const fimStr = gEvent.end?.dateTime || gEvent.end?.date

      if (!inicioStr) continue

      // Determinar tipo do evento
      let tipoSugerido = 'outro'
      const tituloLower = gEvent.summary.toLowerCase()
      if (tituloLower.includes('aniversário') || tituloLower.includes('aniversario') || tituloLower.includes('bday')) {
        tipoSugerido = 'aniversario'
      } else if (tituloLower.includes('viagem') || tituloLower.includes('voo') || tituloLower.includes('aeroporto')) {
        tipoSugerido = 'viagem'
      } else if (tituloLower.includes('férias') || tituloLower.includes('ferias') || tituloLower.includes('praia')) {
        tipoSugerido = 'ferias'
      } else if (tituloLower.includes('churrasco') || tituloLower.includes('almoço') || tituloLower.includes('jantar')) {
        tipoSugerido = 'churrasco'
      } else if (tituloLower.includes('reunião') || tituloLower.includes('reuniao') || tituloLower.includes('médico') || tituloLower.includes('consulta')) {
        tipoSugerido = 'reuniao'
      }

      // Upsert no Supabase baseado no google_event_id
      const payloadEvento = {
        nome: gEvent.summary,
        data_evento: new Date(inicioStr).toISOString(),
        data_fim: fimStr ? new Date(fimStr).toISOString() : null,
        local: gEvent.location || null,
        descricao: gEvent.description || null,
        tipo: tipoSugerido,
        google_event_id: gEvent.id,
        sincronizado_google: true,
      }

      // Verifica se já existe por google_event_id
      const { data: existente } = await supabase
        .from('eventos')
        .select('id')
        .eq('google_event_id', gEvent.id)
        .maybeSingle()

      if (existente) {
        await supabase.from('eventos').update(payloadEvento).eq('id', existente.id)
      } else {
        await supabase.from('eventos').insert([payloadEvento])
        contadorPuxados++
      }
    }

    // 3. ENVIAR (PUSH) eventos locais do Familia OS para o Google Calendar
    // Eventos que não tem google_event_id e foram criados recentemente ou estão no futuro
    const { data: eventosLocais } = await supabase
      .from('eventos')
      .select('*')
      .is('google_event_id', null)
      .gte('data_evento', timeMin)

    let contadorEnviados = 0

    if (eventosLocais && eventosLocais.length > 0) {
      for (const evLocal of eventosLocais) {
        const bodyGoogle: any = {
          summary: evLocal.nome,
          description: evLocal.descricao || 'Criado pelo ecossistema Familia OS',
          location: evLocal.local || evLocal.destino || undefined,
          start: {
            dateTime: new Date(evLocal.data_evento).toISOString(),
          },
          end: {
            dateTime: evLocal.data_fim
              ? new Date(evLocal.data_fim).toISOString()
              : new Date(new Date(evLocal.data_evento).getTime() + 2 * 60 * 60 * 1000).toISOString(),
          },
        }

        const resInsert = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyGoogle),
        })

        if (resInsert.ok) {
          const insertedData = await resInsert.json()
          await supabase
            .from('eventos')
            .update({
              google_event_id: insertedData.id,
              sincronizado_google: true,
            })
            .eq('id', evLocal.id)

          contadorEnviados++
        }
      }
    }

    return NextResponse.json({
      success: true,
      importadosDoGoogle: contadorPuxados,
      enviadosParaOGoogle: contadorEnviados,
      totalNaGoogleAgenda: eventosGoogle.length,
    })
  } catch (err: any) {
    console.error('Erro na sincronização bidirecional do Google Calendar:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
