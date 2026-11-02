import { NextRequest, NextResponse } from 'next/server'
import {
  createSupabaseAdmin,
  createSupabaseAuthAdmin,
  DEFAULT_FAMILIA_ID,
} from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      email,
      password,
      nome,
      perfil,
      avatar_url,
      avatar_emoji,
      saldo_moedas,
      cor_tema,
      familia_id,
    } = body
    const avatarFinal = avatar_url || avatar_emoji || '👤'

    if (!email || !password || !nome) {
      return NextResponse.json({ error: 'E-mail, senha e nome são obrigatórios.' }, { status: 400 })
    }

    const familiaAlvoId = familia_id || DEFAULT_FAMILIA_ID
    const supabaseAdmin = createSupabaseAdmin()
    const supabaseAuthAdmin = createSupabaseAuthAdmin()

    // 1. Criar usuário confirmado no Supabase Auth (mesma instância do Signage TV)
    const { data: authData, error: authError } = await supabaseAuthAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        app: 'familia_os',
        name: nome.trim(),
        nome: nome.trim(),
        perfil: perfil || 'filho_membro',
        familia_id: familiaAlvoId,
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message || 'Erro ao criar usuário no Supabase Auth.' },
        { status: 400 }
      )
    }

    const userId = authData.user?.id

    if (userId) {
      // 2. Atualizar ou inserir perfil em familialm.usuarios com o familia_id do tenant
      const payloadUsuario: Record<string, any> = {
        id: userId,
        auth_user_id: userId,
        familia_id: familiaAlvoId,
        email: email.trim(),
        nome: nome.trim(),
        perfil: perfil || 'filho_membro',
        saldo_moedas: parseInt(saldo_moedas) || 0,
        avatar_url: avatarFinal,
        cor_tema: cor_tema || '#4f46e5',
        ativo: true,
      }

      const { error: errUpdate } = await supabaseAdmin.from('usuarios').upsert(payloadUsuario)

      if (errUpdate) {
        // Fallback caso a coluna familia_id ainda não tenha sido aplicada no banco remoto
        delete payloadUsuario.familia_id
        await supabaseAdmin.from('usuarios').upsert(payloadUsuario)
      }
    }

    return NextResponse.json({ success: true, user: authData.user })
  } catch (err: any) {
    console.error('Erro no cadastro de usuário:', err)
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 })
  }
}
