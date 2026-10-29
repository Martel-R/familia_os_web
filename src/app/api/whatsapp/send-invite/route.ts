import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api-supabase.martel.page'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'familialm' }
})

async function obterConfiguracao() {
  const { data } = await supabase
    .from('configuracoes_casa')
    .select('valor')
    .eq('id', 'evolution_whatsapp')
    .maybeSingle()

  if (!data?.valor?.serverUrl || !data?.valor?.apiKey) {
    throw new Error('Evolution API não configurada. Configure o servidor e a API Key no menu de WhatsApp.')
  }
  return data.valor
}

function normalizarTelefoneWhatsapp(telefone: string): string {
  let limpo = telefone.replace(/\D/g, '')
  // Se não tiver DDI (55), adiciona
  if (limpo.length === 10 || limpo.length === 11) {
    limpo = '55' + limpo
  }
  return limpo
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { convidadoId, eventoId, todosPendentes } = body

    const config = await obterConfiguracao()
    const { serverUrl, apiKey, instanceName } = config

    // Lista de convidados a enviar
    let listaConvidados: any[] = []

    if (convidadoId) {
      const { data, error } = await supabase
        .from('convidados')
        .select('*, eventos(*)')
        .eq('id', convidadoId)
        .single()
      if (error || !data) throw new Error('Convidado não encontrado.')
      listaConvidados = [data]
    } else if (eventoId && todosPendentes) {
      const { data, error } = await supabase
        .from('convidados')
        .select('*, eventos(*)')
        .eq('evento_id', eventoId)
        .eq('status', 'pendente')
      if (error) throw error
      listaConvidados = data || []
    }

    if (listaConvidados.length === 0) {
      return NextResponse.json({ error: 'Nenhum convidado pendente com telefone para enviar.' }, { status: 400 })
    }

    const resultados: any[] = []

    for (const c of listaConvidados) {
      if (!c.telefone) {
        resultados.push({ id: c.id, nome: c.nome, sucesso: false, erro: 'Telefone ausente' })
        continue
      }

      const numFormatado = normalizarTelefoneWhatsapp(c.telefone)
      const ev = c.eventos

      // Formatação da data
      let dataFormatada = 'Data a confirmar'
      if (ev?.data_evento) {
        try {
          const d = new Date(ev.data_evento)
          dataFormatada = d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        } catch {}
      }

      // Monta o texto do convite
      const texto = `Olá, *${c.nome}*! 🎉\n\nVocê foi convidado para o evento *${ev?.nome || 'Encontro Familiar'}* da nossa família!\n\n📅 *Data:* ${dataFormatada}\n📍 *Local:* ${ev?.local || 'A definir'}${ev?.descricao ? `\n📝 *Detalhes:* ${ev.descricao}` : ''}\n\nPara nos ajudar na organização, por favor responda com:\n👉 Digite *1* para *CONFIRMAR PRESENÇA* ✅\n👉 Digite *2* se *NÃO PUDER COMPARECER* ❌\n\nContamos com você! 🥳`

      try {
        const resEnvio = await fetch(`${serverUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: apiKey,
          },
          body: JSON.stringify({
            number: numFormatado,
            text: texto,
          }),
        })

        const dataEnvio = await resEnvio.json()

        if (!resEnvio.ok) {
          throw new Error(dataEnvio?.message || dataEnvio?.error || 'Erro no envio da mensagem.')
        }

        // Atualiza convidado no banco
        await supabase
          .from('convidados')
          .update({
            convite_enviado_em: new Date().toISOString(),
            status_envio: 'enviado',
            mensagem_id: dataEnvio?.key?.id || null,
          })
          .eq('id', c.id)

        resultados.push({ id: c.id, nome: c.nome, sucesso: true, mensagemId: dataEnvio?.key?.id })
      } catch (errEnvio: any) {
        await supabase
          .from('convidados')
          .update({
            status_envio: 'erro',
          })
          .eq('id', c.id)

        resultados.push({ id: c.id, nome: c.nome, sucesso: false, erro: errEnvio.message })
      }
    }

    return NextResponse.json({
      success: true,
      total: listaConvidados.length,
      resultados,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
