import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api-supabase.martel.page'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'familialm' }
})

export async function POST(request: Request) {
  try {
    const payload = await request.json()

    // Evolution API envia eventos como MESSAGES_UPSERT ou messages.upsert
    const eventoTipo = payload.event || payload.type
    if (eventoTipo && !eventoTipo.toUpperCase().includes('MESSAGES')) {
      return NextResponse.json({ status: 'ignored', motivo: 'Evento não é de mensagem' })
    }

    const data = payload.data
    if (!data) {
      return NextResponse.json({ status: 'ignored', motivo: 'Dados ausentes' })
    }

    const key = data.key
    if (!key || key.fromMe) {
      // Ignora mensagens enviadas pelo próprio bot/instância
      return NextResponse.json({ status: 'ignored', motivo: 'Mensagem enviada por mim' })
    }

    // Extrai número do remetente
    const remoteJid = key.remoteJid || ''
    const numeroRemetente = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
    if (!numeroRemetente) {
      return NextResponse.json({ status: 'ignored', motivo: 'Número do remetente não identificado' })
    }

    // Extrai texto da mensagem
    const mensagemObj = data.message || {}
    const textoMensagem = (
      mensagemObj.conversation ||
      mensagemObj.extendedTextMessage?.text ||
      mensagemObj.buttonsResponseMessage?.selectedButtonId ||
      mensagemObj.listResponseMessage?.singleSelectReply?.selectedRowId ||
      ''
    ).trim()

    if (!textoMensagem) {
      return NextResponse.json({ status: 'ignored', motivo: 'Texto da mensagem vazio' })
    }

    const textoLower = textoMensagem.toLowerCase()

    // Identifica intenção de resposta
    let novoStatus: 'confirmado' | 'recusado' | null = null

    // Padrões de Confirmação
    if (
      textoLower === '1' ||
      textoLower.startsWith('1 ') ||
      textoLower.includes('confirm') ||
      textoLower.includes('sim') ||
      textoLower.includes('vou') ||
      textoLower.includes('estarei lá') ||
      textoLower.includes('com certeza')
    ) {
      novoStatus = 'confirmado'
    }
    // Padrões de Recusa
    else if (
      textoLower === '2' ||
      textoLower.startsWith('2 ') ||
      textoLower.includes('não') ||
      textoLower.includes('nao') ||
      textoLower.includes('recus') ||
      textoLower.includes('não vou') ||
      textoLower.includes('nao poderei') ||
      textoLower.includes('infelizmente')
    ) {
      novoStatus = 'recusado'
    }

    if (!novoStatus) {
      // Não foi uma resposta de confirmação/recusa reconhecida
      return NextResponse.json({ status: 'ignored', motivo: 'Resposta não conclusiva para RSVP' })
    }

    // Localiza o convidado pendente comparando os últimos 8 dígitos do telefone
    // (para contornar variações de DDI 55, DDD e 9º dígito)
    const ultimos8Digitos = numeroRemetente.slice(-8)

    const { data: convidados, error: convError } = await supabase
      .from('convidados')
      .select('*, eventos(*)')
      .order('convite_enviado_em', { ascending: false })

    if (convError || !convidados) {
      return NextResponse.json({ status: 'error', erro: 'Erro ao buscar convidados' }, { status: 500 })
    }

    // Encontra o convidado mais recente com esse telefone
    const convidadoAlvo = convidados.find((c) => {
      if (!c.telefone) return false
      const telLimpo = c.telefone.replace(/\D/g, '')
      return telLimpo.endsWith(ultimos8Digitos)
    })

    if (!convidadoAlvo) {
      return NextResponse.json({ status: 'ignored', motivo: 'Convidado não encontrado para este telefone' })
    }

    // Atualiza status do convidado no banco
    const { error: upError } = await supabase
      .from('convidados')
      .update({
        status: novoStatus,
        resposta_texto: textoMensagem,
      })
      .eq('id', convidadoAlvo.id)

    if (upError) throw upError

    // Envia réplica de confirmação via Evolution API
    try {
      const { data: configData } = await supabase
        .from('configuracoes_casa')
        .select('valor')
        .eq('id', 'evolution_whatsapp')
        .maybeSingle()

      if (configData?.valor?.serverUrl && configData?.valor?.apiKey) {
        const { serverUrl, apiKey, instanceName } = configData.valor
        const nomeEvento = convidadoAlvo.eventos?.nome || 'o evento'

        const textoResposta =
          novoStatus === 'confirmado'
            ? `🎉 Que ótimo, *${convidadoAlvo.nome}*! Sua presença no evento *${nomeEvento}* foi *CONFIRMADA* com sucesso!\n\nEstamos ansiosos para celebrar com você! Até lá! ✨`
            : `🙏 Entendido, *${convidadoAlvo.nome}*! Registramos que você não poderá comparecer ao evento *${nomeEvento}*.\n\nMuito obrigado por nos avisar! Sentiremos sua falta!`

        await fetch(`${serverUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: apiKey,
          },
          body: JSON.stringify({
            number: numeroRemetente,
            text: textoResposta,
          }),
        })
      }
    } catch (errReplica) {
      console.error('Erro ao enviar réplica automática:', errReplica)
    }

    return NextResponse.json({
      status: 'success',
      convidadoId: convidadoAlvo.id,
      nome: convidadoAlvo.nome,
      novoStatus,
      resposta: textoMensagem,
    })
  } catch (err: any) {
    console.error('Erro no webhook do WhatsApp:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
