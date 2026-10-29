import { supabase } from '@/lib/supabase/client'
import { NextRequest } from 'next/server'

export function getGoogleOAuthCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://familia.martel.page'
  const redirectUri = `${appUrl}/api/google-calendar/callback`

  return {
    clientId,
    clientSecret,
    redirectUri,
  }
}

export function getPublicOrigin(req: NextRequest): string {
  // 1. Query param origin explicitamente enviado pelo navegador (window.location.origin)
  const paramOrigin = req.nextUrl.searchParams.get('origin')
  if (paramOrigin && paramOrigin.startsWith('http')) {
    return paramOrigin.replace(/\/$/, '')
  }

  // 2. Variável de ambiente de produção
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }

  // 3. Headers de proxy reverso (Cloudflare Tunnel / Nginx)
  const forwardedHost = req.headers.get('x-forwarded-host') || req.headers.get('host')
  const forwardedProto = req.headers.get('x-forwarded-proto') || (forwardedHost?.includes('localhost') ? 'http' : 'https')

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`.replace(/\/$/, '')
  }

  return req.nextUrl.origin.replace(/\/$/, '')
}

export function gerarAuthUrlGoogle(redirectUriOverride?: string): string {
  const { clientId, redirectUri } = getGoogleOAuthCredentials()
  const uri = redirectUriOverride || redirectUri

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: uri,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function renovarAccessTokenSeNecessario(integracao: any): Promise<string> {
  const agora = new Date()
  const expiraEm = integracao.token_expires_at ? new Date(integracao.token_expires_at) : null

  // Se o token ainda tem mais de 5 minutos de validade, usa o atual
  if (expiraEm && expiraEm.getTime() - agora.getTime() > 5 * 60 * 1000) {
    return integracao.access_token
  }

  if (!integracao.refresh_token) {
    return integracao.access_token
  }

  const { clientId, clientSecret } = getGoogleOAuthCredentials()

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integracao.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const dados = await response.json()
  if (!response.ok) {
    throw new Error(dados.error_description || 'Falha ao renovar token do Google Calendar.')
  }

  const novoExpiresAt = new Date(Date.now() + (dados.expires_in || 3600) * 1000).toISOString()

  await supabase
    .from('integracoes_google')
    .update({
      access_token: dados.access_token,
      token_expires_at: novoExpiresAt,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', integracao.id)

  return dados.access_token
}
