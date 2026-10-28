'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Usuario {
  id: string
  nome: string
  email?: string
  perfil: 'pai_admin' | 'filho_membro' | 'cuidador'
  saldo_moedas: number
  avatar_url?: string
  ativo: boolean
  cor_tema?: string
  criado_em: string
  auth_user_id?: string
}

const EMOJIS_PADRAO = ['👨', '👩', '👦', '👧', '👶', '👵', '🧓', '🦸', '🧚', '🐱', '🐶', '⭐']

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos')

  // Modal de Criação de Novo Usuário (com E-mail e Senha no Supabase Auth)
  const [modalCriarAberto, setModalCriarAberto] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [novoNome, setNovoNome] = useState('')
  const [novoPerfil, setNovoPerfil] = useState<'pai_admin' | 'filho_membro' | 'cuidador'>('filho_membro')
  const [novoSaldoMoedas, setNovoSaldoMoedas] = useState('0')
  const [novoAvatar, setNovoAvatar] = useState('👦')
  const [novoCorTema, setNovoCorTema] = useState('#4f46e5')
  const [salvandoCriacao, setSalvandoCriacao] = useState(false)

  // Modal de Edição de Perfil
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editPerfil, setEditPerfil] = useState<'pai_admin' | 'filho_membro' | 'cuidador'>('filho_membro')
  const [editAvatar, setEditAvatar] = useState('👦')
  const [editCorTema, setEditCorTema] = useState('#4f46e5')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Modal de Ajuste Rápido de Moedas
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
    setNovoEmail('')
    setNovaSenha('')
    setNovoNome('')
    setNovoPerfil('filho_membro')
    setNovoSaldoMoedas('0')
    setNovoAvatar('👦')
    setNovoCorTema('#4f46e5')
    setModalCriarAberto(true)
  }

  const handleCriarUsuarioSupabase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoEmail.trim() || !novaSenha.trim() || !novoNome.trim() || salvandoCriacao) return

    setSalvandoCriacao(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: novoEmail.trim(),
          password: novaSenha,
          nome: novoNome.trim(),
          perfil: novoPerfil,
          saldo_moedas: parseInt(novoSaldoMoedas) || 0,
          avatar_url: novoAvatar,
          cor_tema: novoCorTema,
        }),
      })

      const resultado = await response.json()
      if (!response.ok) {
        throw new Error(resultado.error || 'Falha ao cadastrar usuário.')
      }

      await carregarUsuarios()
      setModalCriarAberto(false)
      alert(`Usuário "${novoNome}" criado com sucesso no Supabase Auth e vinculado ao Familia OS!`)
    } catch (err: any) {
      alert('Erro ao criar usuário: ' + err.message)
    } finally {
      setSalvandoCriacao(false)
    }
  }

  const abrirEdicao = (u: Usuario) => {
    setUsuarioEditando(u)
    setEditNome(u.nome)
    setEditPerfil(u.perfil)
    setEditAvatar(u.avatar_url || '👤')
    setEditCorTema(u.cor_tema || '#4f46e5')
    setModalEdicaoAberto(true)
  }

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioEditando || !editNome.trim() || salvandoEdicao) return

    setSalvandoEdicao(true)
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome: editNome.trim(),
          perfil: editPerfil,
          avatar_url: editAvatar,
          cor_tema: editCorTema,
        })
        .eq('id', usuarioEditando.id)

      if (error) throw error

      await carregarUsuarios()
      setModalEdicaoAberto(false)
      alert('Perfil atualizado com sucesso!')
    } catch (err: any) {
      alert('Erro ao salvar alterações: ' + err.message)
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const toggleAtivo = async (u: Usuario) => {
    const novoStatus = !u.ativo
    const acao = novoStatus ? 'ativar' : 'inativar'
    if (!confirm(`Deseja realmente ${acao} o acesso de "${u.nome}"?`)) return

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
    if (!confirm(`Tem certeza que deseja remover o usuário "${nome}"?`)) return

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
      alert(`Saldo de ${usuarioMoedas.nome} atualizado para ⭐ ${novoSaldo} moedas!`)
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
            Usuários & Membros da Família
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Todos os usuários sincronizados com o Supabase Auth com e-mail, permissões e status.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={carregarUsuarios} className="btn btn-secondary">
            🔄 Atualizar Lista
          </button>
          <button type="button" onClick={abrirCriacao} className="btn btn-primary">
            👤 + Criar Usuário (Supabase Auth)
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
          Carregando usuários do Supabase...
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
          Nenhum usuário encontrado. Clique em "👤 + Criar Usuário (Supabase Auth)" para cadastrar.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
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

                  {/* E-mail Vinculado ao Supabase Auth */}
                  <div style={{ marginBottom: '12px', fontSize: '0.825rem', color: 'var(--texto-secundario)', wordBreak: 'break-all' }}>
                    <span style={{ marginRight: '6px' }}>✉️</span>
                    <strong>{u.email || 'Sem e-mail'}</strong>
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
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Saldo de Moedas</div>
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

      {/* Modal de Criação de Novo Usuário no Supabase Auth */}
      {modalCriarAberto && (
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
          <div className="card" style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>👤 Novo Usuário no Supabase</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                  Cria credencial oficial de login no Supabase Auth e perfil no Familia OS.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalCriarAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCriarUsuarioSupabase} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">E-mail de Acesso</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="exemplo@familia.com"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Senha Inicial</label>
                  <input
                    type="password"
                    minLength={6}
                    className="input"
                    placeholder="Mínimo 6 dígitos"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome Completo</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Gabriel Martel"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Papel / Perfil</label>
                  <select
                    className="input"
                    value={novoPerfil}
                    onChange={(e) => setNovoPerfil(e.target.value as any)}
                  >
                    <option value="filho_membro">Filho(a) / Criança</option>
                    <option value="pai_admin">Pai / Mãe (Admin)</option>
                    <option value="cuidador">Cuidador / Apoio</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Escolha um Emoji / Avatar</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {EMOJIS_PADRAO.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNovoAvatar(emoji)}
                      style={{
                        fontSize: '1.4rem',
                        padding: '6px 10px',
                        borderRadius: 'var(--raio-md)',
                        border: novoAvatar === emoji ? '2px solid var(--cor-primaria)' : '1px solid var(--borda)',
                        backgroundColor: novoAvatar === emoji ? 'var(--cor-primaria-suave)' : 'transparent',
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
                  <label className="form-label">Saldo Inicial de Moedas</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={novoSaldoMoedas}
                    onChange={(e) => setNovoSaldoMoedas(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cor de Destaque</label>
                  <input
                    type="color"
                    className="input"
                    value={novoCorTema}
                    onChange={(e) => setNovoCorTema(e.target.value)}
                    style={{ height: '42px', padding: '2px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalCriarAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoCriacao}>
                  {salvandoCriacao ? 'Criando no Supabase...' : 'Confirmar e Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Perfil */}
      {modalEdicaoAberto && usuarioEditando && (
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>✏️ Editar Perfil de {usuarioEditando.nome}</h2>
              <button
                type="button"
                onClick={() => setModalEdicaoAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome Completo</label>
                <input
                  type="text"
                  className="input"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Papel / Perfil</label>
                  <select
                    className="input"
                    value={editPerfil}
                    onChange={(e) => setEditPerfil(e.target.value as any)}
                  >
                    <option value="filho_membro">Filho(a) / Criança</option>
                    <option value="pai_admin">Pai / Mãe (Admin)</option>
                    <option value="cuidador">Cuidador / Apoio</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cor de Destaque</label>
                  <input
                    type="color"
                    className="input"
                    value={editCorTema}
                    onChange={(e) => setEditCorTema(e.target.value)}
                    style={{ height: '42px', padding: '2px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Avatar / Emoji</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {EMOJIS_PADRAO.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditAvatar(emoji)}
                      style={{
                        fontSize: '1.4rem',
                        padding: '6px 10px',
                        borderRadius: 'var(--raio-md)',
                        border: editAvatar === emoji ? '2px solid var(--cor-primaria)' : '1px solid var(--borda)',
                        backgroundColor: editAvatar === emoji ? 'var(--cor-primaria-suave)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalEdicaoAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoEdicao}>
                  {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
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
