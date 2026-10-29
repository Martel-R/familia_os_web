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
    throw new Error('Evolution API não configurada. Configure o servidor e a API Key primeiro.')
  }
  return data.valor
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { acao } = body // 'create' | 'connect' | 'status' | 'logout'
    const config = await obterConfiguracao()
    const { serverUrl, apiKey, instanceName } = config

    const headers = {
      'Content-Type': 'application/json',
      apikey: apiKey,
    }

    if (acao === 'create') {
      // POST /instance/create
      const webhookUrl = 'https://familia.martel.page/api/webhooks/whatsapp'
      const res = await fetch(`${serverUrl}/instance/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instanceName: instanceName,
          token: apiKey,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: {
            enabled: true,
            url: webhookUrl,
            byEvents: false,
            events: ['MESSAGES_UPSERT'],
          },
        }),
      })

      const data = await res.json()
      return NextResponse.json(data)
    }

    if (acao === 'connect') {
      // GET /instance/connect/{instanceName}
      const res = await fetch(`${serverUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers,
      })

      const data = await res.json()
      return NextResponse.json(data)
    }

    if (acao === 'status') {
      // GET /instance/connectionState/{instanceName}
      const res = await fetch(`${serverUrl}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers,
      })

      const data = await res.json()
      return NextResponse.json(data)
    }

    if (acao === 'logout') {
      // DELETE /instance/logout/{instanceName}
      const res = await fetch(`${serverUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers,
      })

      const data = await res.json()
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
