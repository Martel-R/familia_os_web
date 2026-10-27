'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
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
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
        })
        if (error) throw error
        setMensagem({
          tipo: 'sucesso',
          texto: 'Cadastro realizado com sucesso! Se necessário, confirme o e-mail ou faça login.',
        })
        setModoCadastro(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
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
            {carregando ? 'Autenticando...' : modoCadastro ? 'Cadastrar' : 'Entrar no Sistema'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={() => {
              setModoCadastro(!modoCadastro)
              setMensagem(null)
            }}
            style={{ background: 'none', border: 'none', color: 'var(--cor-primaria)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}
          >
            {modoCadastro ? 'Já possui conta? Faça login' : 'Não tem conta? Cadastrar novo membro'}
          </button>
        </div>
      </div>
    </div>
  )
}
