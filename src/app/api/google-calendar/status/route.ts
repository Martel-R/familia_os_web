import { NextRequest, NextResponse } from 'next/server'
import { connection } from 'next/server'
import { getGoogleOAuthCredentials } from '@/lib/google-calendar'
import { supabase } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  await connection()
  const { clientId, clientSecret } = getGoogleOAuthCredentials()
  const isConfigured = Boolean(clientId && clientSecret)

  try {
    const { data, error } = await supabase
      .from('integracoes_google')
      .select('*')
      .eq('ativo', true)
      .order('atualizado_em', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        configured: isConfigured,
        connected: false,
      })
    }

    const integracao = data[0]

    return NextResponse.json({
      configured: isConfigured,
      connected: true,
      email: integracao.email,
      tokenExpiresAt: integracao.token_expires_at,
      updatedAt: integracao.atualizado_em,
    })
  } catch (err: any) {
    return NextResponse.json({
      configured: isConfigured,
      connected: false,
      error: err.message,
    })
  }
}
