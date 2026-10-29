'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Usuario {
  id: string
  nome: string
  avatar_url?: string
}

interface Contato {
  id: string
  nome: string
  categoria: 'amigos' | 'familia' | 'medicos' | 'servicos' | 'apoio' | 'outro'
  especialidade?: string
  membro_id?: string
  grau_parentesco?: string
  telefone: string
  email?: string
  eh_emergencia: boolean
  origem?: string
  observacoes?: string
  criado_em: string
}

const CATEGORIAS_CONTATO: {
  [k: string]: { label: string; icone: string; cor: string; bg: string }
} = {
  amigos: { label: 'Amigos', icone: '🤝', cor: '#2563eb', bg: '#eff6ff' },
  familia: { label: 'Família', icone: '👨‍👩‍👧‍👦', cor: '#7c3aed', bg: '#f5f3ff' },
  medicos: { label: 'Médicos & Clínicas', icone: '🩺', cor: '#059669', bg: '#ecfdf5' },
  servicos: { label: 'Serviços & Apoio', icone: '🛠️', cor: '#d97706', bg: '#fffbeb' },
  apoio: { label: 'Rede de Apoio', icone: '🛡️', cor: '#0284c7', bg: '#f0f9ff' },
}

export default function ContatosPage() {
  const [contatos, setContatos] = useState<Contato[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<string>('todas')

  // Modal Novo / Editar
  const [modalAberto, setModalAberto] = useState(false)
  const [contatoEditando, setContatoEditando] = useState<Contato | null>(null)
  const [categoria, setCategoria] = useState<'amigos' | 'familia' | 'medicos' | 'servicos' | 'apoio'>('amigos')
  const [membroId, setMembroId] = useState('')
  const [grauParentesco, setGrauParentesco] = useState('')
  const [nome, setNome] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [ehEmergencia, setEhEmergencia] = useState(false)
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const [resContatos, resUsuarios] = await Promise.all([
        supabase
          .from('agenda_contatos')
          .select('*')
          .order('eh_emergencia', { ascending: false })
          .order('nome', { ascending: true }),
        supabase
          .from('usuarios')
          .select('id, nome, avatar_url, ativo')
          .eq('ativo', true)
          .order('nome', { ascending: true }),
      ])

      if (resContatos.data) setContatos(resContatos.data)
      if (resUsuarios.data) setUsuarios(resUsuarios.data)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirCriacao = () => {
    setContatoEditando(null)
    setCategoria('amigos')
    setMembroId('')
    setGrauParentesco('')
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
    setCategoria((c.categoria as any) || 'amigos')
    setMembroId(c.membro_id || '')
    setGrauParentesco(c.grau_parentesco || '')
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
        categoria: categoria,
        especialidade: especialidade.trim() || null,
        membro_id: membroId || null,
        grau_parentesco: categoria === 'familia' ? (grauParentesco.trim() || null) : null,
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

      await carregarDados()
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
    const texto = busca.toLowerCase().trim()
    const bateuBusca =
      !texto ||
      c.nome.toLowerCase().includes(texto) ||
      (c.especialidade && c.especialidade.toLowerCase().includes(texto)) ||
      (c.grau_parentesco && c.grau_parentesco.toLowerCase().includes(texto)) ||
      c.telefone.includes(texto)

    if (!bateuBusca) return false

    if (filtroCategoria === 'todas') return true
    if (filtroCategoria === 'emergencia') return c.eh_emergencia
    return (c.categoria || 'amigos') === filtroCategoria
  })

  // Contadores
  const totalFamilia = contatos.filter((c) => c.categoria === 'familia').length
  const totalAmigos = contatos.filter((c) => !c.categoria || c.categoria === 'amigos').length
  const totalMedicos = contatos.filter((c) => c.categoria === 'medicos').length
  const totalServicos = contatos.filter((c) => c.categoria === 'servicos').length
  const totalApoio = contatos.filter((c) => c.categoria === 'apoio').length
  const totalEmergencia = contatos.filter((c) => c.eh_emergencia).length

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      {/* Topo / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Agenda de Contatos & Apoio da Família
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Amigos, família, médicos com especialidades e vínculo familiar, prestadores e rede de apoio.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" onClick={carregarDados} className="btn btn-secondary">
            🔄 Sincronizar / Atualizar
          </button>
          <button type="button" onClick={abrirCriacao} className="btn btn-primary" style={{ fontWeight: 700 }}>
            📞 + Novo Contato
          </button>
        </div>
      </div>

      {/* Barra de Filtros por Categoria & Busca */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="input"
              placeholder="🔍 Buscar por nome, especialidade, parentesco ou telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {/* Chips de Categorias */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setFiltroCategoria('todas')}
            className={`btn ${filtroCategoria === 'todas' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            Todos ({contatos.length})
          </button>

          <button
            type="button"
            onClick={() => setFiltroCategoria('familia')}
            className={`btn ${filtroCategoria === 'familia' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            👨‍👩‍👧‍👦 Família ({totalFamilia})
          </button>

          <button
            type="button"
            onClick={() => setFiltroCategoria('amigos')}
            className={`btn ${filtroCategoria === 'amigos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            🤝 Amigos ({totalAmigos})
          </button>

          <button
            type="button"
            onClick={() => setFiltroCategoria('medicos')}
            className={`btn ${filtroCategoria === 'medicos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            🩺 Médicos & Clínicas ({totalMedicos})
          </button>

          <button
            type="button"
            onClick={() => setFiltroCategoria('servicos')}
            className={`btn ${filtroCategoria === 'servicos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            🛠️ Serviços ({totalServicos})
          </button>

          <button
            type="button"
            onClick={() => setFiltroCategoria('apoio')}
            className={`btn ${filtroCategoria === 'apoio' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            🛡️ Apoio ({totalApoio})
          </button>

          <button
            type="button"
            onClick={() => setFiltroCategoria('emergencia')}
            className={`btn ${filtroCategoria === 'emergencia' ? 'btn-danger' : 'btn-secondary'}`}
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
          Nenhum contato encontrado nesta categoria. Clique em "+ Novo Contato" para cadastrar amigos, familiares ou médicos!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '20px' }}>
          {contatosFiltrados.map((c) => {
            const telLimpo = c.telefone.replace(/\D/g, '')
            const catInfo = CATEGORIAS_CONTATO[c.categoria] || CATEGORIAS_CONTATO.amigos
            const membroVinculado = usuarios.find((u) => u.id === c.membro_id)

            return (
              <div
                key={c.id}
                className="card"
                style={{
                  borderLeft: c.eh_emergencia ? '4px solid var(--cor-perigo)' : `4px solid ${catInfo.cor}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  {/* Badges de Categoria e Emergência */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: catInfo.bg,
                        color: catInfo.cor,
                        border: `1px solid ${catInfo.cor}40`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {catInfo.icone} {catInfo.label}
                    </span>

                    {c.eh_emergencia && (
                      <span className="badge badge-danger">
                        🚨 SOS EMERGÊNCIA
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '2px' }}>{c.nome}</h3>

                  {/* Informações Específicas por Categoria */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {c.categoria === 'medicos' && (
                      <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600 }}>
                        🩺 Especialidade: {c.especialidade || 'Clínica Geral'}
                      </div>
                    )}

                    {c.categoria === 'familia' && c.grau_parentesco && (
                      <div style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 600 }}>
                        👨‍👩‍👧‍👦 Parentesco: {c.grau_parentesco}
                      </div>
                    )}

                    {c.categoria === 'servicos' && c.especialidade && (
                      <div style={{ fontSize: '0.85rem', color: '#d97706', fontWeight: 600 }}>
                        🛠️ Serviço: {c.especialidade}
                      </div>
                    )}

                    {/* Vínculo com Membro da Família */}
                    {membroVinculado ? (
                      <div style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span>👤 Vinculado a:</span>
                        <strong style={{ color: 'var(--texto-principal)' }}>{membroVinculado.nome}</strong>
                      </div>
                    ) : (
                      c.categoria === 'medicos' && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                          👨‍👩‍👧‍👦 Atende a família toda
                        </div>
                      )
                    )}
                  </div>

                  {/* Telefone e Email */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', marginTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📞</span>
                      <strong style={{ fontSize: '1rem', color: 'var(--texto-principal)' }}>{c.telefone}</strong>
                    </div>

                    {c.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--texto-secundario)' }}>
                        <span>✉️</span>
                        <a href={`mailto:${c.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {c.email}
                        </a>
                      </div>
                    )}

                    {c.observacoes && (
                      <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--texto-secundario)', backgroundColor: 'var(--bg-hover)', padding: '6px 10px', borderRadius: 'var(--raio-sm)' }}>
                        {c.observacoes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Botões de Ação Direta */}
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--borda)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <a
                    href={`tel:${telLimpo}`}
                    className="btn btn-secondary"
                    style={{ flex: 1, minWidth: '75px', padding: '6px 10px', fontSize: '0.8rem', textAlign: 'center', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    📞 Ligar
                  </a>

                  <a
                    href={`https://wa.me/55${telLimpo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ flex: 1, minWidth: '95px', padding: '6px 10px', fontSize: '0.8rem', textAlign: 'center', textDecoration: 'none', backgroundColor: '#25D366', borderColor: '#25D366', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 600 }}
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

      {/* Modal Novo / Editar Contato com Configuração de Categorias e Vínculos */}
      {modalAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
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
              {/* Seleção de Categoria */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Categoria do Contato *</label>
                <select
                  className="input"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value as any)}
                >
                  <option value="amigos">🤝 Amigos</option>
                  <option value="familia">👨‍👩‍👧‍👦 Família & Parentes</option>
                  <option value="medicos">🩺 Médicos & Clínicas de Saúde</option>
                  <option value="servicos">🛠️ Prestadores de Serviço</option>
                  <option value="apoio">🛡️ Rede de Apoio Geral</option>
                </select>
              </div>

              {/* Campos Dinâmicos: Médicos */}
              {categoria === 'medicos' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#ecfdf5', padding: '12px', borderRadius: 'var(--raio-md)', border: '1px solid #a7f3d0' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: '#065f46', fontWeight: 700 }}>Especialidade Médica</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: Pediatra, Cardiologista, Dentista"
                      value={especialidade}
                      onChange={(e) => setEspecialidade(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: '#065f46', fontWeight: 700 }}>Médico de Qual Familiar?</label>
                    <select
                      className="input"
                      value={membroId}
                      onChange={(e) => setMembroId(e.target.value)}
                    >
                      <option value="">👨‍👩‍👧‍👦 Toda a Família</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Campos Dinâmicos: Família */}
              {categoria === 'familia' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: '#f5f3ff', padding: '12px', borderRadius: 'var(--raio-md)', border: '1px solid #ddd6fe' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: '#6d28d9', fontWeight: 700 }}>Grau de Parentesco</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: Tio, Avó, Primo, Padrinho"
                      value={grauParentesco}
                      onChange={(e) => setGrauParentesco(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: '#6d28d9', fontWeight: 700 }}>Vinculado a (Opcional)</label>
                    <select
                      className="input"
                      value={membroId}
                      onChange={(e) => setMembroId(e.target.value)}
                    >
                      <option value="">Família Toda</option>
                      {usuarios.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Campos Dinâmicos: Serviços */}
              {categoria === 'servicos' && (
                <div className="form-group" style={{ marginBottom: 0, backgroundColor: '#fffbeb', padding: '12px', borderRadius: 'var(--raio-md)', border: '1px solid #fde68a' }}>
                  <label className="form-label" style={{ color: '#b45309', fontWeight: 700 }}>Tipo de Serviço / Ofício</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Eletricista, Encanador, Mecânico, Veterinário, Pedreiro"
                    value={especialidade}
                    onChange={(e) => setEspecialidade(e.target.value)}
                  />
                </div>
              )}

              {/* Nome Completo */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome Completo *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Dr. Marcelo, Tio Carlos, Mecânica Rápida"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              {/* Telefone e Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="(91) 9...."
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    required
                  />
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
              </div>

              {/* Observações */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Observações / Endereço / Horários</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Ex: Consultório na Av. Paulista, atende plano Unimed, ligar antes de ir..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              {/* Checkbox Emergência */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="chkEmergencia"
                  checked={ehEmergencia}
                  onChange={(e) => setEhEmergencia(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-perigo)' }}
                />
                <label htmlFor="chkEmergencia" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600, color: 'var(--cor-perigo)' }}>
                  🚨 Marcar como Contato de Emergência (Exibir em destaque no SOS da família)
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvando} style={{ fontWeight: 700 }}>
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
