'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './layout.module.css'
import { supabase } from '@/lib/supabase/client'

export function Header() {
  const router = useRouter()
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null)

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

  return (
    <header className={styles.header}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="badge badge-primary">Schema: familialm</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {usuarioEmail ? (
          <>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{usuarioEmail.split('@')[0]}</div>
              <div style={{ fontSize: '0.725rem', color: 'var(--texto-secundario)' }}>{usuarioEmail}</div>
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
  )
}
