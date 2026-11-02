'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './layout.module.css'
import { supabase } from '@/lib/supabase/client'
import { useFamilia } from '@/lib/tenant/FamiliaContext'

export function Header() {
  const router = useRouter()
  const { familia, usuarioAtual, atualizarNomeFamilia, entrarComCodigoConvite } = useFamilia()
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null)
  const [modalFamiliaAberto, setModalFamiliaAberto] = useState(false)
  const [novoNomeFamilia, setNovoNomeFamilia] = useState('')
  const [codigoConviteInput, setCodigoConviteInput] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function checarAuth() {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.email) {
        setUsuarioEmail(data.user.email)
      }
    }

    checarAuth()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUsuarioEmail(session?.user?.email || null)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUsuarioEmail(null)
    router.push('/login')
    router.refresh()
  }

  const abrirModalFamilia = () => {
    setNovoNomeFamilia(familia.nome || '')
    setCodigoConviteInput('')
    setModalFamiliaAberto(true)
  }

  const copiarCodigo = async () => {
    if (!familia.codigo_convite) return
    try {
      await navigator.clipboard.writeText(familia.codigo_convite)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {}
  }

  const handleSalvarNomeFamilia = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNomeFamilia.trim() || salvando) return
    setSalvando(true)
    try {
      await atualizarNomeFamilia(novoNomeFamilia.trim())
      setModalFamiliaAberto(false)
    } catch (err: any) {
      alert('Erro ao atualizar família: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  const handleVincularConvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!codigoConviteInput.trim() || salvando) return
    setSalvando(true)
    try {
      await entrarComCodigoConvite(codigoConviteInput.trim())
      setModalFamiliaAberto(false)
      window.location.reload()
    } catch (err: any) {
      alert('Erro ao trocar de família: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={abrirModalFamilia}
            className="badge badge-primary"
            style={{
              cursor: 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
            }}
            title="Clique para gerenciar sua Família ou ver código de convite"
          >
            <span>🏠 {familia.nome || 'Minha Família'}</span>
            {familia.codigo_convite && (
              <span style={{ opacity: 0.85, fontWeight: 400 }}>
                • Cód: {familia.codigo_convite}
              </span>
            )}
          </button>
          <span
            className="badge"
            style={{
              backgroundColor: 'var(--bg-hover)',
              color: 'var(--texto-secundario)',
              fontSize: '0.72rem',
            }}
          >
            Multi-Tenant • familialm
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {usuarioEmail ? (
            <>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                  {usuarioAtual?.nome || usuarioEmail.split('@')[0]}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--texto-secundario)' }}>
                  {usuarioEmail}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                Sair
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
              Fazer Login
            </Link>
          )}
        </div>
      </header>

      {modalFamiliaAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '460px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>🏠 Espaço da Família (Multi-Tenant)</h2>
              <button
                type="button"
                onClick={() => setModalFamiliaAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            {familia.codigo_convite && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--raio-md)',
                  backgroundColor: 'var(--cor-primaria-suave)',
                  marginBottom: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>
                    Código de Convite da sua Família
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cor-primaria)', letterSpacing: '0.05em' }}>
                    {familia.codigo_convite}
                  </div>
                </div>
                <button type="button" onClick={copiarCodigo} className="btn btn-secondary" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
                  {copiado ? '✅ Copiado!' : '📋 Copiar'}
                </button>
              </div>
            )}

            <form onSubmit={handleSalvarNomeFamilia} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Família / Casa</label>
                <input
                  type="text"
                  className="input"
                  value={novoNomeFamilia}
                  onChange={(e) => setNovoNomeFamilia(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Atualizar Nome da Família'}
              </button>
            </form>

            <hr style={{ border: 'none', borderTop: '1px solid var(--borda)', margin: '16px 0' }} />

            <form onSubmit={handleVincularConvite} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Entrar em outra Família com Código de Convite
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: MARTEL"
                  value={codigoConviteInput}
                  onChange={(e) => setCodigoConviteInput(e.target.value.toUpperCase())}
                />
                <button type="submit" className="btn btn-secondary" disabled={salvando || !codigoConviteInput.trim()}>
                  Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
