import { NextRequest, NextResponse } from 'next/server'
import { connection } from 'next/server'
import { getGoogleOAuthCredentials, gerarAuthUrlGoogle, getPublicOrigin } from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  await connection()
  const { clientId, clientSecret } = getGoogleOAuthCredentials()

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      configured: false,
      message: 'Credenciais do Google Cloud Console não configuradas (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).',
    })
  }

  const origin = getPublicOrigin(req)
  const redirectUriDynamic = `${origin}/api/google-calendar/callback`

  const url = gerarAuthUrlGoogle(redirectUriDynamic)

  return NextResponse.json({
    configured: true,
    url,
    redirectUri: redirectUriDynamic,
  })
}
