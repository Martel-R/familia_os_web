import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api-supabase.martel.page',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      db: {
        schema: 'familialm',
      },
    }
  )
}

export const supabase = createClient()
