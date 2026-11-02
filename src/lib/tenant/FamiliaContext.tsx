'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'

export const DEFAULT_FAMILIA_ID = '00000000-0000-0000-0000-000000000001'

export interface FamiliaTenant {
  id: string
  nome: string
  slug?: string
  codigo_convite?: string
  plano?: string
  ativo?: boolean
}

export interface UsuarioTenant {
  id: string
  familia_id?: string
  nome: string
  email?: string
  perfil: 'pai_admin' | 'filho_membro' | 'cuidador'
  saldo_moedas: number
  avatar_url?: string
  cor_tema?: string
  auth_user_id?: string
}

interface FamiliaContextType {
  familiaId: string
  familia: FamiliaTenant
  usuarioAtual: UsuarioTenant | null
  carregandoTenant: boolean
  recarregarTenant: () => Promise<void>
  atualizarNomeFamilia: (novoNome: string) => Promise<void>
  entrarComCodigoConvite: (codigo: string) => Promise<void>
}

const FAMILIA_INICIAL: FamiliaTenant = {
  id: DEFAULT_FAMILIA_ID,
  nome: 'Família Martel',
  slug: 'familia-martel',
  codigo_convite: 'MARTEL',
  plano: 'premium',
  ativo: true,
}

const FamiliaContext = createContext<FamiliaContextType>({
  familiaId: DEFAULT_FAMILIA_ID,
  familia: FAMILIA_INICIAL,
  usuarioAtual: null,
  carregandoTenant: true,
  recarregarTenant: async () => {},
  atualizarNomeFamilia: async () => {},
  entrarComCodigoConvite: async () => {},
})

export function FamiliaProvider({ children }: { children: React.ReactNode }) {
  const [familia, setFamilia] = useState<FamiliaTenant>(FAMILIA_INICIAL)
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioTenant | null>(null)
  const [carregandoTenant, setCarregandoTenant] = useState<boolean>(true)

  const recarregarTenant = useCallback(async () => {
    try {
      setCarregandoTenant(true)
      const { data: authData } = await supabase.auth.getUser()
      const user = authData?.user

      const params = new URLSearchParams()
      if (user?.id) params.set('authUserId', user.id)
      if (user?.email) params.set('email', user.email)

      const res = await fetch(`/api/tenant?${params.toString()}`)
      if (res.ok) {
        const json = await res.json()
        if (json.familia) {
          setFamilia(json.familia)
          try {
            localStorage.setItem('familia_os_tenant_ativo', JSON.stringify(json.familia))
          } catch {}
        }
        if (json.usuario) {
          setUsuarioAtual(json.usuario)
        }
      }
    } catch {
      try {
        const salvo = localStorage.getItem('familia_os_tenant_ativo')
        if (salvo) {
          setFamilia(JSON.parse(salvo))
        }
      } catch {}
    } finally {
      setCarregandoTenant(false)
    }
  }, [])

  useEffect(() => {
    recarregarTenant()

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      recarregarTenant()
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [recarregarTenant])

  const atualizarNomeFamilia = async (novoNome: string) => {
    const res = await fetch('/api/tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'atualizar_familia',
        familiaId: familia.id,
        nome: novoNome,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao atualizar nome da família.')
    if (json.familia) {
      setFamilia(json.familia)
      try {
        localStorage.setItem('familia_os_tenant_ativo', JSON.stringify(json.familia))
      } catch {}
    }
  }

  const entrarComCodigoConvite = async (codigo: string) => {
    const { data: authData } = await supabase.auth.getUser()
    const res = await fetch('/api/tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'vincular_convite',
        usuarioId: usuarioAtual?.id,
        authUserId: authData?.user?.id,
        codigoConvite: codigo,
      }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erro ao vincular código de convite.')
    await recarregarTenant()
  }

  return (
    <FamiliaContext.Provider
      value={{
        familiaId: familia.id || DEFAULT_FAMILIA_ID,
        familia,
        usuarioAtual,
        carregandoTenant,
        recarregarTenant,
        atualizarNomeFamilia,
        entrarComCodigoConvite,
      }}
    >
      {children}
    </FamiliaContext.Provider>
  )
}

export function useFamilia() {
  return useContext(FamiliaContext)
}
