'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [nomeFamilia, setNomeFamilia] = useState('')
  const [codigoConvite, setCodigoConvite] = useState('')
  const [tipoCadastro, setTipoCadastro] = useState<'nova_familia' | 'convite'>('nova_familia')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null)
  const [modoCadastro, setModoCadastro] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !senha || carregando) return

    setCarregando(true)
    setMensagem(null)

    try {
      if (modoCadastro) {
        if (!nomeUsuario.trim()) {
          throw new Error('Informe o seu nome completo.')
        }
        if (tipoCadastro === 'nova_familia' && !nomeFamilia.trim()) {
          throw new Error('Informe o nome da sua Família (ex: Família Silva).')
        }
        if (tipoCadastro === 'convite' && !codigoConvite.trim()) {
          throw new Error('Informe o código de convite da Família.')
        }

        const res = await fetch('/api/tenant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao: 'registrar_familia',
            email: email.trim(),
            password: senha,
            nomeUsuario: nomeUsuario.trim(),
            nomeFamilia: nomeFamilia.trim(),
            codigoConvite: codigoConvite.trim(),
            modoConvite: tipoCadastro === 'convite',
          }),
        })

        const resultado = await res.json()
        if (!res.ok) {
          throw new Error(resultado.error || 'Falha ao cadastrar família.')
        }

        // Autentica imediatamente após o registro multi-tenant
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        })

        if (signInErr) {
          setMensagem({
            tipo: 'sucesso',
            texto: `Família "${resultado.familia?.nome}" criada com sucesso! Faça login abaixo.`,
          })
          setModoCadastro(false)
        } else {
          router.push('/')
          router.refresh()
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        })
        if (error) throw error
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      setMensagem({
        tipo: 'erro',
        texto: err.message || 'Falha ao autenticar.',
      })
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '36px 32px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 12px',
              borderRadius: 'var(--raio-md)',
              background: 'linear-gradient(135deg, var(--cor-primaria), #818cf8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '1.5rem',
            }}
          >
            F
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Familia OS</h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.85rem', marginTop: '4px' }}>
            {modoCadastro ? 'Crie o acesso de um membro da família' : 'Entre para gerenciar sua casa e finanças'}
          </p>
        </div>

        {mensagem && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--raio-md)',
              fontSize: '0.85rem',
              marginBottom: '20px',
              backgroundColor: mensagem.tipo === 'erro' ? 'var(--cor-perigo-suave)' : 'var(--cor-sucesso-suave)',
              color: mensagem.tipo === 'erro' ? 'var(--cor-perigo)' : 'var(--cor-sucesso)',
              border: `1px solid ${mensagem.tipo === 'erro' ? 'var(--cor-perigo)' : 'var(--cor-sucesso)'}`,
            }}
          >
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {modoCadastro && (
            <>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTipoCadastro('nova_familia')}
                  className={`btn ${tipoCadastro === 'nova_familia' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.78rem', padding: '8px' }}
                >
                  🏠 Criar Nova Família
                </button>
                <button
                  type="button"
                  onClick={() => setTipoCadastro('convite')}
                  className={`btn ${tipoCadastro === 'convite' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, fontSize: '0.78rem', padding: '8px' }}
                >
                  🔑 Tenho Código
                </button>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Seu Nome</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: João Silva"
                  value={nomeUsuario}
                  onChange={(e) => setNomeUsuario(e.target.value)}
                  required
                />
              </div>

              {tipoCadastro === 'nova_familia' ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome da Família / Casa</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Família Silva"
                    value={nomeFamilia}
                    onChange={(e) => setNomeFamilia(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Código de Convite da Família</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: MARTEL"
                    value={codigoConvite}
                    onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                    required
                  />
                </div>
              )}
            </>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">E-mail</label>
            <input
              type="email"
              className="input"
              placeholder="exemplo@familia.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="input"
              placeholder="Sua senha secreta"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px', height: '42px' }} disabled={carregando}>
            {carregando
              ? 'Processando...'
              : modoCadastro
                ? tipoCadastro === 'nova_familia'
                  ? 'Criar Família & Entrar'
                  : 'Entrar na Família'
                : 'Entrar no Sistema'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            type="button"
            onClick={() => {
              setModoCadastro(!modoCadastro)
              setMensagem(null)
            }}
            style={{ background: 'none', border: 'none', color: 'var(--cor-primaria)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
          >
            {modoCadastro ? 'Já possui conta? Faça login' : 'Nova família ou membro convidado? Cadastre-se'}
          </button>

          <div style={{ borderTop: '1px solid var(--borda)', paddingTop: '12px' }}>
            <a
              href="/api/download/apk"
              download="familia-os.apk"
              className="btn btn-secondary"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.8rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <span>📲 Baixar Aplicativo Android (.APK)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
