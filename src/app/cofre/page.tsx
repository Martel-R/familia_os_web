'use client'

import { useState } from 'react'

interface Credencial {
  id: string
  titulo: string
  login: string
  nivel: 'compartilhado' | 'master'
  senhaOculta: string
}

const CREDENCIAIS_INICIAIS: Credencial[] = [
  { id: '1', titulo: 'Wi-Fi da Casa (Rede Principal)', login: 'FamiliaLM_5G', nivel: 'compartilhado', senhaOculta: 'SenhaSuperSegura2026' },
  { id: '2', titulo: 'Netflix Familiar', login: 'casa@familialm.com', nivel: 'compartilhado', senhaOculta: 'PipocaFilme#88' },
  { id: '3', titulo: 'Conta Banco (Pais/Admin)', login: 'marcos.pai', nivel: 'master', senhaOculta: 'CofreBancoMaster!9' },
  { id: '4', titulo: 'Painel do Roteador / Gateway', login: 'admin', nivel: 'master', senhaOculta: 'RoteadorFibra@991' },
]

export default function CofrePage() {
  const [credenciais] = useState<Credencial[]>(CREDENCIAIS_INICIAIS)
  const [visibilidade, setVisibilidade] = useState<{ [id: string]: boolean }>({})

  const toggleVisibilidade = (id: string) => {
    setVisibilidade((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Cofre de Identidade & Senhas
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Acesso centralizado e seguro com criptografia de ponta a ponta (E2E) para as senhas da família.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {credenciais.map((c) => {
          const visivel = visibilidade[c.id]
          const isMaster = c.nivel === 'master'

          return (
            <div key={c.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontWeight: 600, fontSize: '1rem' }}>{c.titulo}</span>
                <span className={`badge ${isMaster ? 'badge-danger' : 'badge-primary'}`}>
                  {isMaster ? '🔒 Master (Restrito)' : '👥 Compartilhado'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
                <div>
                  <span style={{ color: 'var(--texto-secundario)' }}>Usuário / Login: </span>
                  <strong>{c.login}</strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <div>
                    <span style={{ color: 'var(--texto-secundario)' }}>Senha: </span>
                    <strong style={{ fontFamily: 'monospace', letterSpacing: visivel ? 'normal' : '0.15em' }}>
                      {visivel ? c.senhaOculta : '••••••••••••'}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleVisibilidade(c.id)}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    {visivel ? 'Ocultar' : 'Revelar'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
