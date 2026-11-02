import { NextRequest, NextResponse } from 'next/server'
import {
  createSupabaseAdmin,
  createSupabaseAuthAdmin,
  DEFAULT_FAMILIA_ID,
} from '@/lib/supabase/admin'

const CATEGORIAS_PADRAO = [
  { nome: 'Moradia', icone: '🏠', cor: '#4F46E5' },
  { nome: 'Alimentação', icone: '🛒', cor: '#10B981' },
  { nome: 'Educação', icone: '📚', cor: '#F59E0B' },
  { nome: 'Saúde', icone: '❤️‍🩹', cor: '#EC4899' },
  { nome: 'Lazer', icone: '🎉', cor: '#8B5CF6' },
  { nome: 'Transporte', icone: '🚗', cor: '#3B82F6' },
  { nome: 'Receitas / Salário', icone: '💰', cor: '#059669' },
]

function gerarCodigoConvite(nomeFamilia: string): string {
  const prefixo =
    nomeFamilia
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 4) || 'CASA'
  const sufixo = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${prefixo}-${sufixo}`
}

function gerarSlug(nome: string): string {
  return (
    nome
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'familia'
  )
}

async function semearCategoriasPadrao(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  familiaId: string
) {
  try {
    const { data: existentes } = await supabase
      .from('categorias_financeiras')
      .select('id')
      .eq('familia_id', familiaId)
      .limit(1)

    if (!existentes || existentes.length === 0) {
      await supabase.from('categorias_financeiras').insert(
        CATEGORIAS_PADRAO.map((c) => ({
          ...c,
          familia_id: familiaId,
        }))
      )
    }
  } catch {
    // Se a coluna familia_id ainda não existir antes da migração, ignora silenciosamente
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const authUserId = searchParams.get('authUserId') || ''
    const email = searchParams.get('email') || ''

    // 1. Busca usuário pelo auth_user_id ou email
    let usuario: any = null
    if (authUserId) {
      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle()
      usuario = data
    }

    if (!usuario && email) {
      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .ilike('email', email)
        .maybeSingle()
      usuario = data
    }

    // 2. Se usuário existe, resolve a família vinculada
    const familiaId = usuario?.familia_id || DEFAULT_FAMILIA_ID

    let familia: any = null
    try {
      const { data: famData, error: famError } = await supabase
        .from('familias')
        .select('*')
        .eq('id', familiaId)
        .maybeSingle()

      if (!famError && famData) {
        familia = famData
      }
    } catch {
      // Fallback caso tabela familias ainda esteja sendo criada
    }

    if (!familia) {
      familia = {
        id: familiaId,
        nome: familiaId === DEFAULT_FAMILIA_ID ? 'Família Martel' : 'Minha Família',
        slug: familiaId === DEFAULT_FAMILIA_ID ? 'familia-martel' : 'minha-familia',
        codigo_convite: familiaId === DEFAULT_FAMILIA_ID ? 'MARTEL' : 'FAMILIA',
        plano: 'premium',
        ativo: true,
      }
    }

    return NextResponse.json({
      usuario,
      familia,
      familiaId: familia.id,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message,
        familia: {
          id: DEFAULT_FAMILIA_ID,
          nome: 'Família Martel',
          slug: 'familia-martel',
          codigo_convite: 'MARTEL',
          plano: 'premium',
          ativo: true,
        },
        familiaId: DEFAULT_FAMILIA_ID,
      },
      { status: 200 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { acao } = body
    const supabase = createSupabaseAdmin()
    const supabaseAuth = createSupabaseAuthAdmin()

    // Ação 1: Cadastrar nova Família (ou entrar com código de convite) + Usuário no Supabase Auth
    if (acao === 'registrar_familia') {
      const {
        email,
        password,
        nomeUsuario,
        nomeFamilia,
        codigoConvite,
        modoConvite,
      } = body

      if (!email || !password || !nomeUsuario) {
        return NextResponse.json(
          { error: 'Nome, e-mail e senha são obrigatórios.' },
          { status: 400 }
        )
      }

      let familiaAlvo: any = null
      let perfilInicial: 'pai_admin' | 'filho_membro' = 'pai_admin'

      if (modoConvite && codigoConvite) {
        const codigoLimpo = String(codigoConvite).trim().toUpperCase()
        const { data: famEncontrada, error: errBusca } = await supabase
          .from('familias')
          .select('*')
          .ilike('codigo_convite', codigoLimpo)
          .maybeSingle()

        if (errBusca || !famEncontrada) {
          return NextResponse.json(
            { error: `Código de convite "${codigoLimpo}" não encontrado.` },
            { status: 404 }
          )
        }
        familiaAlvo = famEncontrada
        perfilInicial = 'filho_membro'
      } else {
        const tituloFamilia = (nomeFamilia || `Família de ${nomeUsuario}`).trim()
        const novoCodigo = gerarCodigoConvite(tituloFamilia)
        const novoSlug = gerarSlug(tituloFamilia)

        const { data: novaFamilia, error: errCriarFam } = await supabase
          .from('familias')
          .insert([
            {
              nome: tituloFamilia,
              slug: novoSlug,
              codigo_convite: novoCodigo,
              plano: 'familiar',
              ativo: true,
            },
          ])
          .select()
          .single()

        if (errCriarFam) {
          return NextResponse.json(
            { error: 'Erro ao criar registro da família: ' + errCriarFam.message },
            { status: 400 }
          )
        }
        familiaAlvo = novaFamilia
      }

      // Cria ou localiza usuário no Supabase Auth
      let authUserId: string | null = null
      const { data: authData, error: authError } = await supabaseAuth.auth.admin.createUser({
        email: email.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          app: 'familia_os',
          nome: nomeUsuario.trim(),
          perfil: perfilInicial,
          familia_id: familiaAlvo.id,
          nome_familia: familiaAlvo.nome,
        },
      })

      if (authError) {
        return NextResponse.json(
          { error: authError.message || 'Erro ao criar conta no Supabase Auth.' },
          { status: 400 }
        )
      }

      authUserId = authData.user?.id || null

      // Verifica se trigger já inseriu em familialm.usuarios
      const { data: existente } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle()

      let usuarioCriado = existente
      if (existente) {
        const { data: atualizado } = await supabase
          .from('usuarios')
          .update({
            nome: nomeUsuario.trim(),
            email: email.trim(),
            perfil: perfilInicial,
            familia_id: familiaAlvo.id,
            ativo: true,
          })
          .eq('id', existente.id)
          .select()
          .single()
        usuarioCriado = atualizado || existente
      } else {
        const { data: inserido, error: errIns } = await supabase
          .from('usuarios')
          .insert([
            {
              id: authUserId || undefined,
              auth_user_id: authUserId,
              familia_id: familiaAlvo.id,
              nome: nomeUsuario.trim(),
              email: email.trim(),
              perfil: perfilInicial,
              saldo_moedas: 0,
              avatar_url: perfilInicial === 'pai_admin' ? '👨' : '👦',
              cor_tema: '#4f46e5',
              ativo: true,
            },
          ])
          .select()
          .single()

        if (errIns) {
          return NextResponse.json(
            { error: 'Erro ao vincular usuário à família: ' + errIns.message },
            { status: 400 }
          )
        }
        usuarioCriado = inserido
      }

      if (!modoConvite) {
        await semearCategoriasPadrao(supabase, familiaAlvo.id)
      }

      return NextResponse.json({
        success: true,
        familia: familiaAlvo,
        usuario: usuarioCriado,
      })
    }

    // Ação 2: Atualizar nome da Família
    if (acao === 'atualizar_familia') {
      const { familiaId, nome } = body
      if (!familiaId || !nome?.trim()) {
        return NextResponse.json(
          { error: 'ID da família e novo nome são obrigatórios.' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('familias')
        .update({
          nome: nome.trim(),
          slug: gerarSlug(nome.trim()),
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', familiaId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, familia: data })
    }

    // Ação 3: Vincular usuário autenticado a outra família via código de convite
    if (acao === 'vincular_convite') {
      const { usuarioId, authUserId, codigoConvite } = body
      if (!codigoConvite) {
        return NextResponse.json(
          { error: 'Informe o código de convite da família.' },
          { status: 400 }
        )
      }

      const codigoLimpo = String(codigoConvite).trim().toUpperCase()
      const { data: fam, error: errFam } = await supabase
        .from('familias')
        .select('*')
        .ilike('codigo_convite', codigoLimpo)
        .maybeSingle()

      if (errFam || !fam) {
        return NextResponse.json(
          { error: `Nenhuma família encontrada com o código "${codigoLimpo}".` },
          { status: 404 }
        )
      }

      let query = supabase.from('usuarios').update({ familia_id: fam.id, ativo: true })
      if (usuarioId) {
        query = query.eq('id', usuarioId)
      } else if (authUserId) {
        query = query.eq('auth_user_id', authUserId)
      } else {
        return NextResponse.json({ error: 'Usuário não identificado.' }, { status: 400 })
      }

      const { error: errUpd } = await query
      if (errUpd) {
        return NextResponse.json({ error: errUpd.message }, { status: 400 })
      }

      return NextResponse.json({ success: true, familia: fam })
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno no tenant.' }, { status: 500 })
  }
}
