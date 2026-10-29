import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api-supabase.martel.page'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'familialm' }
})

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('configuracoes_casa')
      .select('valor, atualizado_em')
      .eq('id', 'evolution_whatsapp')
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return NextResponse.json({
        configurado: false,
        serverUrl: '',
        apiKey: '',
        instanceName: 'familia-os',
      })
    }

    return NextResponse.json({
      configurado: true,
      serverUrl: data.valor?.serverUrl || '',
      apiKey: data.valor?.apiKey || '',
      instanceName: data.valor?.instanceName || 'familia-os',
      atualizado_em: data.atualizado_em,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { serverUrl, apiKey, instanceName } = body

    if (!serverUrl || !apiKey || !instanceName) {
      return NextResponse.json(
        { error: 'Parâmetros serverUrl, apiKey e instanceName são obrigatórios.' },
        { status: 400 }
      )
    }

    // Normaliza URL removendo barra final
    const urlLimpa = serverUrl.replace(/\/+$/, '')

    const payload = {
      serverUrl: urlLimpa,
      apiKey: apiKey.trim(),
      instanceName: instanceName.trim(),
      ativo: true,
    }

    const { error } = await supabase.from('configuracoes_casa').upsert({
      id: 'evolution_whatsapp',
      valor: payload,
      atualizado_em: new Date().toISOString(),
    })

    if (error) throw error

    return NextResponse.json({
      success: true,
      mensagem: 'Configurações da Evolution API salvas com sucesso!',
      config: payload,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
