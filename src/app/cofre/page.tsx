'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Credencial {
  id: string
  titulo: string
  login_usuario: string
  nivel: 'compartilhado' | 'master'
  senha_criptografada: string
  url_acesso?: string
}

export default function CofrePage() {
  const [credenciais, setCredenciais] = useState<Credencial[]>([])
  const [visibilidade, setVisibilidade] = useState<{ [id: string]: boolean }>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Formulário
  const [titulo, setTitulo] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [nivel, setNivel] = useState<'compartilhado' | 'master'>('compartilhado')

  const carregarCredenciais = async () => {
    try {
      setCarregando(true)
      const { data, error } = await supabase
        .from('cofre_credenciais')
        .select('*')
        .order('titulo', { ascending: true })

      if (error) {
        console.error('Erro ao buscar credenciais:', error)
      } else if (data) {
        setCredenciais(data)
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarCredenciais()
  }, [])

  const toggleVisibilidade = (id: string) => {
    setVisibilidade((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !senha.trim() || salvando) return

    setSalvando(true)
    try {
      const nova = {
        titulo,
        login_usuario: login,
        senha_criptografada: senha,
        nivel,
      }

      const { data, error } = await supabase
        .from('cofre_credenciais')
        .insert([nova])
        .select()

      if (error) {
        alert('Erro ao salvar no cofre: ' + error.message)
      } else if (data) {
        setCredenciais([...credenciais, data[0]])
        setTitulo('')
        setLogin('')
        setSenha('')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Cofre de Identidade & Senhas
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Credenciais salvas de forma segura no Supabase (schema <code>familialm</code>).
          </p>
        </div>
      </div>

      {/* Formulário de Nova Credencial */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Adicionar Nova Senha ao Cofre</h2>
        <form onSubmit={handleAdicionar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Serviço / Título</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Wi-Fi Principal, Netflix"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Usuário / Login</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: conta@email.com"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="input"
              placeholder="Senha de acesso"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nível de Proteção</label>
            <select
              className="input"
              value={nivel}
              onChange={(e) => setNivel(e.target.value as any)}
            >
              <option value="compartilhado">Compartilhado (Família)</option>
              <option value="master">Master (Apenas Pais)</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvando}>
            {salvando ? 'Salvando...' : '+ Guardar no Cofre'}
          </button>
        </form>
      </div>

      {/* Lista de Senhas */}
      {credenciais.length === 0 && !carregando ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
          Nenhuma credencial cadastrada no cofre ainda.
        </div>
      ) : (
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
                    <strong>{c.login_usuario || 'Não informado'}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <div>
                      <span style={{ color: 'var(--texto-secundario)' }}>Senha: </span>
                      <strong style={{ fontFamily: 'monospace', letterSpacing: visivel ? 'normal' : '0.15em' }}>
                        {visivel ? c.senha_criptografada : '••••••••••••'}
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
      )}

    </div>
  )
}
