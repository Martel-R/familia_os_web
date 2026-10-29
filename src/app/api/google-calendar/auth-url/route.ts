import { NextRequest, NextResponse } from 'next/server'
import { getGoogleOAuthCredentials, gerarAuthUrlGoogle } from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthCredentials()

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      configured: false,
      message: 'Credenciais do Google Cloud Console não configuradas (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).',
    })
  }

  // Permite passar redirect_uri dinâmico baseado na origem da requisição
  const origin = req.headers.get('origin') || req.nextUrl.origin
  const redirectUriDynamic = `${origin}/api/google-calendar/callback`

  const url = gerarAuthUrlGoogle(redirectUriDynamic)

  return NextResponse.json({
    configured: true,
    url,
    redirectUri: redirectUriDynamic,
  })
}
