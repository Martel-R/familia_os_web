import { NextRequest, NextResponse } from 'next/server'
import { getGoogleOAuthCredentials } from '@/lib/google-calendar'
import { supabase } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const errorParam = req.nextUrl.searchParams.get('error')

  const origin = req.nextUrl.origin
  const redirectPage = `${origin}/eventos`

  if (errorParam || !code) {
    return NextResponse.redirect(`${redirectPage}?google_error=${encodeURIComponent(errorParam || 'Autorização negada')}`)
  }

  const { clientId, clientSecret } = getGoogleOAuthCredentials()
  const redirectUri = `${origin}/api/google-calendar/callback`

  try {
    // 1. Trocar o authorization code por tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || 'Erro ao trocar código por token.')
    }

    // 2. Obter e-mail da conta Google conectada
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userInfo = await userInfoRes.json()
    const emailGoogle = userInfo.email || 'conta.google@familia.com'

    // 3. Salvar no Supabase
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString()

    const { error: dbError } = await supabase
      .from('integracoes_google')
      .upsert(
        {
          email: emailGoogle,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          token_expires_at: expiresAt,
          ativo: true,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )

    if (dbError) {
      console.error('Erro ao salvar tokens no banco:', dbError)
    }

    return NextResponse.redirect(`${redirectPage}?google_connected=true&email=${encodeURIComponent(emailGoogle)}`)
  } catch (err: any) {
    console.error('Falha no callback do Google:', err)
    return NextResponse.redirect(`${redirectPage}?google_error=${encodeURIComponent(err.message)}`)
  }
}
