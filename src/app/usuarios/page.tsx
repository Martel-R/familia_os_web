'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Usuario {
  id: string
  nome: string
  perfil: 'pai_admin' | 'filho_membro' | 'cuidador'
  saldo_moedas: number
  avatar_url?: string
  ativo: boolean
  cor_tema?: string
  criado_em: string
}

const EMOJIS_PADRAO = ['👦', '👧', '👨', '👩', '👶', '👵', '🧓', '🦸', '🧚', '🐱', '🐶', '⭐']

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos')

  // Modal de Criação / Edição
  const [modalAberto, setModalAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [nome, setNome] = useState('')
  const [perfil, setPerfil] = useState<'pai_admin' | 'filho_membro' | 'cuidador'>('filho_membro')
  const [saldoMoedas, setSaldoMoedas] = useState('0')
  const [avatar, setAvatar] = useState('👦')
  const [corTema, setCorTema] = useState('#4f46e5')
  const [ativo, setAtivo] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Modal de Ajuste de Saldo Rápido de Moedas
  const [modalMoedasAberto, setModalMoedasAberto] = useState(false)
  const [usuarioMoedas, setUsuarioMoedas] = useState<Usuario | null>(null)
  const [quantidadeMoedas, setQuantidadeMoedas] = useState('10')
  const [tipoOperacaoMoedas, setTipoOperacaoMoedas] = useState<'adicionar' | 'remover'>('adicionar')
  const [salvandoMoedas, setSalvandoMoedas] = useState(false)

  const carregarUsuarios = async () => {
    try {
      setCarregando(true)
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome', { ascending: true })

      if (error) {
        console.error('Erro ao buscar usuários:', error)
      } else if (data) {
        setUsuarios(data)
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarUsuarios()
  }, [])

  const abrirCriacao = () => {
    setUsuarioEditando(null)
    setNome('')
    setPerfil('filho_membro')
    setSaldoMoedas('0')
    setAvatar('👦')
    setCorTema('#4f46e5')
    setAtivo(true)
    setModalAberto(true)
  }

  const abrirEdicao = (u: Usuario) => {
    setUsuarioEditando(u)
    setNome(u.nome)
    setPerfil(u.perfil)
    setSaldoMoedas(String(u.saldo_moedas || 0))
    setAvatar(u.avatar_url || '👦')
    setCorTema(u.cor_tema || '#4f46e5')
    setAtivo(u.ativo !== false)
    setModalAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || salvando) return

    setSalvando(true)
    try {
      const payload: any = {
        nome: nome.trim(),
        perfil,
        saldo_moedas: parseInt(saldoMoedas) || 0,
        avatar_url: avatar || '👦',
        cor_tema: corTema,
        ativo,
      }

      if (usuarioEditando) {
        const { error } = await supabase
          .from('usuarios')
          .update(payload)
          .eq('id', usuarioEditando.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('usuarios').insert([payload])
        if (error) throw error
      }

      await carregarUsuarios()
      setModalAberto(false)
      alert(`Membro ${usuarioEditando ? 'atualizado' : 'cadastrado'} com sucesso!`)
    } catch (err: any) {
      alert('Erro ao salvar usuário: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  const toggleAtivo = async (u: Usuario) => {
    const novoStatus = !u.ativo
    const acao = novoStatus ? 'ativar' : 'inativar'
    if (!confirm(`Deseja realmente ${acao} o membro "${u.nome}"?`)) return

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ ativo: novoStatus })
        .eq('id', u.id)

      if (error) throw error

      setUsuarios(usuarios.map((item) => (item.id === u.id ? { ...item, ativo: novoStatus } : item)))
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message)
    }
  }

  const excluirUsuario = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir o perfil de "${nome}"?`)) return

    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id)
      if (error) throw error
      setUsuarios(usuarios.filter((u) => u.id !== id))
    } catch (err: any) {
      alert('Erro ao excluir usuário: ' + err.message)
    }
  }

  const abrirAjusteMoedas = (u: Usuario) => {
    setUsuarioMoedas(u)
    setQuantidadeMoedas('10')
    setTipoOperacaoMoedas('adicionar')
    setModalMoedasAberto(true)
  }

  const handleSalvarAjusteMoedas = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioMoedas || salvandoMoedas) return

    const qtd = parseInt(quantidadeMoedas) || 0
    if (qtd <= 0) {
      alert('Informe uma quantidade válida de moedas.')
      return
    }

    setSalvandoMoedas(true)
    try {
      const delta = tipoOperacaoMoedas === 'adicionar' ? qtd : -qtd
      const novoSaldo = Math.max(0, (usuarioMoedas.saldo_moedas || 0) + delta)

      const { error } = await supabase
        .from('usuarios')
        .update({ saldo_moedas: novoSaldo })
        .eq('id', usuarioMoedas.id)

      if (error) throw error

      await carregarUsuarios()
      setModalMoedasAberto(false)
      alert(`Saldo de ${usuarioMoedas.nome} atualizado para ${novoSaldo} moedas!`)
    } catch (err: any) {
      alert('Erro ao atualizar moedas: ' + err.message)
    } finally {
      setSalvandoMoedas(false)
    }
  }

  const rotuloPerfil = (p: string) => {
    switch (p) {
      case 'pai_admin':
        return 'Pai / Mãe (Admin)'
      case 'filho_membro':
        return 'Filho(a) / Criança'
      case 'cuidador':
        return 'Cuidador / Apoio'
      default:
        return p
    }
  }

  const usuariosFiltrados = usuarios.filter((u) => {
    if (filtroStatus === 'ativos') return u.ativo !== false
    if (filtroStatus === 'inativos') return u.ativo === false
    return true
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Membros da Família & Perfis
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Gerencie os perfis dos membros da casa, controle de moedas e ativação/inativação de usuários.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={abrirCriacao} className="btn btn-primary">
            👤 + Novo Membro da Família
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setFiltroStatus('todos')}
          className={`btn ${filtroStatus === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: '0.85rem' }}
        >
          Todos ({usuarios.length})
        </button>
        <button
          type="button"
          onClick={() => setFiltroStatus('ativos')}
          className={`btn ${filtroStatus === 'ativos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: '0.85rem' }}
        >
          Ativos ({usuarios.filter((u) => u.ativo !== false).length})
        </button>
        <button
          type="button"
          onClick={() => setFiltroStatus('inativos')}
          className={`btn ${filtroStatus === 'inativos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '6px 14px', fontSize: '0.85rem' }}
        >
          Inativos ({usuarios.filter((u) => u.ativo === false).length})
        </button>
      </div>

      {/* Grid de Membros */}
      {carregando ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
          Carregando membros da família...
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
          Nenhum membro encontrado. Clique em "👤 + Novo Membro da Família" para cadastrar filhos, pais e cuidadores.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {usuariosFiltrados.map((u) => {
            const isAtivo = u.ativo !== false
            return (
              <div
                key={u.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${isAtivo ? u.cor_tema || 'var(--cor-primaria)' : 'var(--texto-secundario)'}`,
                  opacity: isAtivo ? 1 : 0.65,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-hover)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.75rem',
                        }}
                      >
                        {u.avatar_url || '👤'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{u.nome}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>
                          {rotuloPerfil(u.perfil)}
                        </div>
                      </div>
                    </div>

                    <span className={`badge ${isAtivo ? 'badge-success' : 'badge-danger'}`}>
                      {isAtivo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Saldo de Moedas do Membro */}
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--raio-md)',
                      backgroundColor: 'var(--bg-hover)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Cofrinho de Moedas</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>
                        ⭐ {u.saldo_moedas || 0} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>moedas</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirAjusteMoedas(u)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      title="Bonificar ou debitar moedas"
                    >
                      Ajustar +/-
                    </button>
                  </div>
                </div>

                {/* Ações do Card */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--borda)' }}>
                  <button
                    type="button"
                    onClick={() => toggleAtivo(u)}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
                  >
                    {isAtivo ? 'Inativar' : 'Reativar'}
                  </button>

                  <button
                    type="button"
                    onClick={() => abrirEdicao(u)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    title="Editar Perfil"
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    onClick={() => excluirUsuario(u.id, u.nome)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--cor-perigo)' }}
                    title="Excluir Perfil"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Membro */}
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
                {usuarioEditando ? '✏️ Editar Membro da Família' : '👤 Novo Membro da Família'}
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
                <label className="form-label">Nome do Membro</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Gabriel, Sofia, Lucas"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Papel / Perfil</label>
                  <select
                    className="input"
                    value={perfil}
                    onChange={(e) => setPerfil(e.target.value as any)}
                  >
                    <option value="filho_membro">Filho(a) / Criança</option>
                    <option value="pai_admin">Pai / Mãe (Admin)</option>
                    <option value="cuidador">Cuidador / Apoio</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Saldo de Moedas Inicial</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={saldoMoedas}
                    onChange={(e) => setSaldoMoedas(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Escolha um Emoji / Avatar</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {EMOJIS_PADRAO.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setAvatar(emoji)}
                      style={{
                        fontSize: '1.4rem',
                        padding: '6px 10px',
                        borderRadius: 'var(--raio-md)',
                        border: avatar === emoji ? '2px solid var(--cor-primaria)' : '1px solid var(--borda)',
                        backgroundColor: avatar === emoji ? 'var(--cor-primaria-suave)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cor de Destaque</label>
                  <input
                    type="color"
                    className="input"
                    value={corTema}
                    onChange={(e) => setCorTema(e.target.value)}
                    style={{ height: '42px', padding: '2px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status do Membro</label>
                  <select
                    className="input"
                    value={ativo ? 'true' : 'false'}
                    onChange={(e) => setAtivo(e.target.value === 'true')}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : usuarioEditando ? 'Salvar Alterações' : 'Cadastrar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Bonificação / Débito Rápido de Moedas */}
      {modalMoedasAberto && usuarioMoedas && (
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
          <div className="card" style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>⭐ Ajustar Moedas de {usuarioMoedas.nome}</h2>
              <button
                type="button"
                onClick={() => setModalMoedasAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginBottom: '16px' }}>
              Saldo atual: <strong>⭐ {usuarioMoedas.saldo_moedas || 0} moedas</strong>
            </p>

            <form onSubmit={handleSalvarAjusteMoedas} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo de Ajuste</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setTipoOperacaoMoedas('adicionar')}
                    className={`btn ${tipoOperacaoMoedas === 'adicionar' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    + Bonificar / Dar
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoOperacaoMoedas('remover')}
                    className={`btn ${tipoOperacaoMoedas === 'remover' ? 'btn-danger' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    - Debitar / Retirar
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Quantidade de Moedas</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={quantidadeMoedas}
                  onChange={(e) => setQuantidadeMoedas(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalMoedasAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoMoedas}>
                  {salvandoMoedas ? 'Atualizando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
