'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Contato {
  id: string
  nome: string
  especialidade?: string
  telefone: string
  email?: string
  eh_emergencia: boolean
  origem?: string
  observacoes?: string
  criado_em: string
}

export default function ContatosPage() {
  const [contatos, setContatos] = useState<Contato[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroEmergencia, setFiltroEmergencia] = useState(false)

  // Modal Novo / Editar
  const [modalAberto, setModalAberto] = useState(false)
  const [contatoEditando, setContatoEditando] = useState<Contato | null>(null)
  const [nome, setNome] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [ehEmergencia, setEhEmergencia] = useState(false)
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregarContatos = async () => {
    try {
      setCarregando(true)
      const { data, error } = await supabase
        .from('agenda_contatos')
        .select('*')
        .order('eh_emergencia', { ascending: false })
        .order('nome', { ascending: true })

      if (error) {
        console.error('Erro ao buscar contatos:', error)
      } else if (data) {
        setContatos(data)
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarContatos()
  }, [])

  const abrirCriacao = () => {
    setContatoEditando(null)
    setNome('')
    setEspecialidade('')
    setTelefone('')
    setEmail('')
    setEhEmergencia(false)
    setObservacoes('')
    setModalAberto(true)
  }

  const abrirEdicao = (c: Contato) => {
    setContatoEditando(c)
    setNome(c.nome)
    setEspecialidade(c.especialidade || '')
    setTelefone(c.telefone)
    setEmail(c.email || '')
    setEhEmergencia(c.eh_emergencia)
    setObservacoes(c.observacoes || '')
    setModalAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !telefone.trim() || salvando) return

    setSalvando(true)
    try {
      const payload: any = {
        nome: nome.trim(),
        especialidade: especialidade.trim() || null,
        telefone: telefone.trim(),
        email: email.trim() || null,
        eh_emergencia: ehEmergencia,
        observacoes: observacoes.trim() || null,
        origem: contatoEditando ? contatoEditando.origem : 'manual',
        atualizado_em: new Date().toISOString(),
      }

      if (contatoEditando) {
        const { error } = await supabase.from('agenda_contatos').update(payload).eq('id', contatoEditando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('agenda_contatos').insert([payload])
        if (error) throw error
      }

      await carregarContatos()
      setModalAberto(false)
      alert(`Contato ${contatoEditando ? 'atualizado' : 'cadastrado'} com sucesso!`)
    } catch (err: any) {
      alert('Erro ao salvar contato: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  const excluirContato = async (id: string, nome: string) => {
    if (!confirm(`Remover "${nome}" da agenda da família?`)) return

    try {
      const { error } = await supabase.from('agenda_contatos').delete().eq('id', id)
      if (error) throw error
      setContatos(contatos.filter((c) => c.id !== id))
    } catch (err: any) {
      alert('Erro ao excluir contato: ' + err.message)
    }
  }

  const contatosFiltrados = contatos.filter((c) => {
    const texto = busca.toLowerCase()
    const bateuBusca =
      c.nome.toLowerCase().includes(texto) ||
      (c.especialidade && c.especialidade.toLowerCase().includes(texto)) ||
      c.telefone.includes(texto)

    if (filtroEmergencia) {
      return bateuBusca && c.eh_emergencia
    }
    return bateuBusca
  })

  const totalEmergencia = contatos.filter((c) => c.eh_emergencia).length

  return (
    <div>
      {/* Topo / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Agenda de Contatos & Apoio da Família
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Telefones de emergência, médicos, escola, prestadores de serviço e contatos sincronizados do celular.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={carregarContatos} className="btn btn-secondary">
            🔄 Sincronizar / Atualizar
          </button>
          <button type="button" onClick={abrirCriacao} className="btn btn-primary">
            📞 + Novo Contato
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            className="input"
            placeholder="🔍 Buscar por nome, especialidade ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setFiltroEmergencia(false)}
            className={`btn ${!filtroEmergencia ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            Todos ({contatos.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroEmergencia(true)}
            className={`btn ${filtroEmergencia ? 'btn-danger' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            🚨 Emergências ({totalEmergencia})
          </button>
        </div>
      </div>

      {/* Grid de Contatos */}
      {carregando ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
          Carregando contatos da família...
        </div>
      ) : contatosFiltrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
          Nenhum contato encontrado. Sincronize pelo app Android ou clique em "+ Novo Contato" para cadastrar.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {contatosFiltrados.map((c) => {
            const telLimpo = c.telefone.replace(/\D/g, '')

            return (
              <div
                key={c.id}
                className="card"
                style={{
                  borderLeft: c.eh_emergencia ? '4px solid var(--cor-perigo)' : '4px solid var(--cor-primaria)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{c.nome}</h3>
                      <div style={{ fontSize: '0.8rem', color: 'var(--cor-primaria)', fontWeight: 600 }}>
                        {c.especialidade || 'Contato Geral'}
                      </div>
                    </div>

                    {c.eh_emergencia && (
                      <span className="badge badge-danger">
                        🚨 EMERGÊNCIA
                      </span>
                    )}
                  </div>

                  {c.origem && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--texto-secundario)', marginBottom: '12px' }}>
                      {c.origem === 'agenda_telefone' ? '📱 Sincronizado do Celular' : '💻 Cadastro Manual'}
                    </div>
                  )}

                  {/* Informações de Contato */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📞</span>
                      <strong style={{ fontSize: '1rem' }}>{c.telefone}</strong>
                    </div>

                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--texto-secundario)' }}>
                        <span>✉️</span>
                        <span>{c.email}</span>
                      </div>
                    )}

                    {c.observacoes && (
                      <div style={{ marginTop: '6px', fontSize: '0.8rem', color: 'var(--texto-secundario)' }}>
                        {c.observacoes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botões de Ação Direta */}
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--borda)', display: 'flex', gap: '8px' }}>
                  <a
                    href={`tel:${telLimpo}`}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', textAlign: 'center', textDecoration: 'none' }}
                  >
                    📞 Ligar
                  </a>

                  <a
                    href={`https://wa.me/55${telLimpo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem', textAlign: 'center', textDecoration: 'none', backgroundColor: '#25D366', borderColor: '#25D366' }}
                  >
                    💬 WhatsApp
                  </a>

                  <button
                    type="button"
                    onClick={() => abrirEdicao(c)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    title="Editar contato"
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    onClick={() => excluirContato(c.id, c.nome)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--cor-perigo)' }}
                    title="Excluir contato"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Novo / Editar Contato */}
      {modalAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {contatoEditando ? '✏️ Editar Contato' : '📞 Novo Contato da Família'}
              </h2>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome Completo</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Dr. Marcelo (Pediatra), Encanador João, Tia Maria"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Especialidade / Relação</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Pediatra, Eletricista, Família"
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="(91) 9...."
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">E-mail (Opcional)</label>
                <input
                  type="email"
                  className="input"
                  placeholder="contato@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Observações / Detalhes</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Ex: Atende 24h, aceita plano Unimed..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="chkEmergencia"
                  checked={ehEmergencia}
                  onChange={(e) => setEhEmergencia(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-perigo)' }}
                />
                <label htmlFor="chkEmergencia" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: 'var(--cor-perigo)' }}>
                  🚨 Marcar como Contato de Emergência
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : contatoEditando ? 'Salvar Alterações' : 'Cadastrar Contato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
