import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api-supabase.martel.page'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export async function POST(req: NextRequest) {
  try {
    const { email, password, nome, perfil, avatar_url, saldo_moedas, cor_tema } = await req.json()

    if (!email || !password || !nome) {
      return NextResponse.json({ error: 'E-mail, senha e nome são obrigatórios.' }, { status: 400 })
    }

    // 1. Criar usuário no Supabase Auth
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        data: { name: nome },
      }),
    })

    const authData = await authRes.json()

    if (!authRes.ok) {
      return NextResponse.json(
        { error: authData.msg || authData.error_description || 'Erro ao criar usuário no Supabase Auth.' },
        { status: authRes.status }
      )
    }

    const userId = authData.id || authData.user?.id

    if (userId) {
      // 2. Atualizar ou garantir informações adicionais no perfil familialm.usuarios
      const { error: errUpdate } = await supabase
        .from('usuarios')
        .upsert({
          id: userId,
          auth_user_id: userId,
          email,
          nome,
          perfil: perfil || 'pai_admin',
          saldo_moedas: parseInt(saldo_moedas) || 0,
          avatar_url: avatar_url || '👤',
          cor_tema: cor_tema || '#4f46e5',
          ativo: true,
        })

      if (errUpdate) {
        console.error('Erro ao atualizar perfil familialm.usuarios:', errUpdate)
      }
    }

    return NextResponse.json({ success: true, user: authData.user || authData })
  } catch (err: any) {
    console.error('Erro no cadastro de usuário:', err)
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 })
  }
}
