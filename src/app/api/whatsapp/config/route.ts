import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin, DEFAULT_FAMILIA_ID } from '@/lib/supabase/admin'

const supabase = createSupabaseAdmin()

function obterConfigId(familiaId?: string | null) {
  if (!familiaId || familiaId === DEFAULT_FAMILIA_ID) {
    return 'evolution_whatsapp'
  }
  return `evolution_whatsapp:${familiaId}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const familiaId = searchParams.get('familiaId')
    const configId = obterConfigId(familiaId)

    let { data, error } = await supabase
      .from('configuracoes_casa')
      .select('valor, atualizado_em')
      .eq('id', configId)
      .maybeSingle()

    if (!data && configId !== 'evolution_whatsapp') {
      const fallback = await supabase
        .from('configuracoes_casa')
        .select('valor, atualizado_em')
        .eq('id', 'evolution_whatsapp')
        .maybeSingle()
      data = fallback.data
      error = fallback.error
    }

    if (error) throw error

    if (!data) {
      return NextResponse.json({
        configurado: false,
        serverUrl: '',
        apiKey: '',
        instanceName: 'familia-os',
      })
    }

    const srvUrl = data.valor?.serverUrl || data.valor?.url || ''
    const instName = data.valor?.instanceName || data.valor?.instance || 'familia-os'

    return NextResponse.json({
      configurado: true,
      serverUrl: srvUrl,
      url: srvUrl,
      apiKey: data.valor?.apiKey || '',
      instanceName: instName,
      instance: instName,
      atualizado_em: data.atualizado_em,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { serverUrl, url, apiKey, instanceName, instance, familiaId } = body
    const srvUrlFinal = (serverUrl || url || '').trim()
    const instNameFinal = (instanceName || instance || '').trim()

    if (!srvUrlFinal || !apiKey || !instNameFinal) {
      return NextResponse.json(
        { error: 'Parâmetros serverUrl, apiKey e instanceName são obrigatórios.' },
        { status: 400 }
      )
    }

    // Normaliza URL removendo barra final
    const urlLimpa = srvUrlFinal.replace(/\/+$/, '')

    const payload = {
      serverUrl: urlLimpa,
      apiKey: apiKey.trim(),
      instanceName: instNameFinal,
      ativo: true,
    }

    const configId = obterConfigId(familiaId)

    const { error } = await supabase.from('configuracoes_casa').upsert({
      id: configId,
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
