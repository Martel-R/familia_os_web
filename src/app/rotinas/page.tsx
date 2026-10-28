'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

interface Usuario {
  id: string
  nome: string
  perfil: 'pai_admin' | 'filho_membro' | 'cuidador'
  saldo_moedas: number
  avatar_url?: string
  ativo: boolean
  cor_tema?: string
}

interface Tarefa {
  id: string
  titulo: string
  responsavel_id?: string
  recorrencia: 'unica' | 'diaria' | 'semanal' | 'mensal'
  dias_semana?: string
  dia_mes?: number
  moedas_recompensa: number
  esta_concluida: boolean
  atualizado_em?: string
}

interface Privilegio {
  id: string
  titulo: string
  custo_moedas: number
  icone?: string
  estoque_disponivel?: number
  descricao?: string
  ativo: boolean
}

interface Resgate {
  id: string
  privilegio_id: string
  usuario_id: string
  moedas_gastas: number
  status: string
  criado_em: string
  usuario_nome?: string
  privilegio_titulo?: string
  privilegio_icone?: string
}

const DIAS_DA_SEMANA = [
  { id: 'Seg', label: 'Segunda' },
  { id: 'Ter', label: 'Terça' },
  { id: 'Qua', label: 'Quarta' },
  { id: 'Qui', label: 'Quinta' },
  { id: 'Sex', label: 'Sexta' },
  { id: 'Sáb', label: 'Sábado' },
  { id: 'Dom', label: 'Domingo' },
]

export default function RotinasPage() {
  const [abaAtiva, setAbaAtiva] = useState<'rotinas' | 'loja' | 'historico'>('rotinas')
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [privilegios, setPrivilegios] = useState<Privilegio[]>([])
  const [resgates, setResgates] = useState<Resgate[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtro de tarefas por membro
  const [membroFiltroId, setMembroFiltroId] = useState<string>('todos')
  const [usuarioLogadoId, setUsuarioLogadoId] = useState<string>('')

  // Formulário de nova rotina
  const [modalTarefaAberto, setModalTarefaAberto] = useState(false)
  const [tarefaEditando, setTarefaEditando] = useState<Tarefa | null>(null)
  const [titulo, setTitulo] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [recorrencia, setRecorrencia] = useState<'unica' | 'diaria' | 'semanal' | 'mensal'>('diaria')
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([])
  const [diaMes, setDiaMes] = useState<number>(1)
  const [moedas, setMoedas] = useState('10')
  const [salvandoTarefa, setSalvandoTarefa] = useState(false)

  // Modal de Criação / Edição de Privilégio na Loja
  const [modalPrivilegioAberto, setModalPrivilegioAberto] = useState(false)
  const [privilegioEditando, setPrivilegioEditando] = useState<Privilegio | null>(null)
  const [privTitulo, setPrivTitulo] = useState('')
  const [privDescricao, setPrivDescricao] = useState('')
  const [privCusto, setPrivCusto] = useState('30')
  const [privIcone, setPrivIcone] = useState('🎮')
  const [salvandoPrivilegio, setSalvandoPrivilegio] = useState(false)

  // Modal de Resgate de Privilégio
  const [modalResgateAberto, setModalResgateAberto] = useState(false)
  const [privilegioParaResgate, setPrivilegioParaResgate] = useState<Privilegio | null>(null)
  const [usuarioResgatandoId, setUsuarioResgatandoId] = useState('')
  const [processandoResgate, setProcessandoResgate] = useState(false)

  const carregarDados = async () => {
    try {
      setCarregando(true)

      // 1. Carregar Membros da Família
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome', { ascending: true })

      let logadoId = ''
      if (usuariosData) {
        setUsuarios(usuariosData)

        // Identificar o usuário logado atualmente no Supabase Auth
        const { data: authData } = await supabase.auth.getUser()
        if (authData?.user) {
          const achou = usuariosData.find(
            (u) => u.auth_user_id === authData.user.id || u.id === authData.user.id || u.email === authData.user.email
          )
          if (achou) {
            logadoId = achou.id
            setUsuarioLogadoId(achou.id)
          }
        }

        const idPadrao = logadoId || usuariosData.find((u) => u.ativo !== false)?.id || ''
        if (idPadrao && !responsavelId) {
          setResponsavelId(idPadrao)
          setUsuarioResgatandoId(idPadrao)
        }
      }

      // 2. Carregar Rotinas / Tarefas
      const { data: tarefasData } = await supabase
        .from('tarefas_rotinas')
        .select('*')
        .order('esta_concluida', { ascending: true })
        .order('atualizado_em', { ascending: false })

      if (tarefasData) {
        setTarefas(tarefasData)
      }

      // 3. Carregar Privilégios da Loja
      const { data: privData } = await supabase
        .from('loja_privilegios')
        .select('*')
        .order('custo_moedas', { ascending: true })

      if (privData) {
        setPrivilegios(privData)
      }

      // 4. Carregar Histórico de Resgates
      const { data: resgatesData } = await supabase
        .from('resgates_privilegios')
        .select('*, usuarios(nome), loja_privilegios(titulo, icone)')
        .order('criado_em', { ascending: false })

      if (resgatesData) {
        const mapeados: Resgate[] = resgatesData.map((r: any) => ({
          id: r.id,
          privilegio_id: r.privilegio_id,
          usuario_id: r.usuario_id,
          moedas_gastas: r.moedas_gastas,
          status: r.status,
          criado_em: r.criado_em,
          usuario_nome: r.usuarios?.nome || 'Membro',
          privilegio_titulo: r.loja_privilegios?.titulo || 'Recompensa',
          privilegio_icone: r.loja_privilegios?.icone || '🎁',
        }))
        setResgates(mapeados)
      }
    } catch (err) {
      console.error('Erro ao carregar módulo de rotinas:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Checkbox de Conclusão de Tarefa com Bonificação Automática de Moedas
  const toggleTarefa = async (tarefa: Tarefa) => {
    const novoStatus = !tarefa.esta_concluida
    const moedasDelta = tarefa.moedas_recompensa || 0

    // Identificar a quem creditar os pontos:
    // Se a tarefa já tem responsável, credita ele.
    // Se a tarefa não tem responsável (órfã), atribui e credita o usuário logado ou o primeiro membro ativo.
    const idAlvo = tarefa.responsavel_id || (membroFiltroId !== 'todos' ? membroFiltroId : usuarioLogadoId) || membrosAtivos[0]?.id

    // Atualização otimista na tela
    setTarefas((prev) =>
      prev.map((t) =>
        t.id === tarefa.id
          ? { ...t, esta_concluida: novoStatus, responsavel_id: t.responsavel_id || idAlvo }
          : t
      )
    )

    try {
      // 1. Atualizar a tarefa no banco
      const payloadTarefa: any = {
        esta_concluida: novoStatus,
        atualizado_em: new Date().toISOString(),
      }
      if (!tarefa.responsavel_id && idAlvo) {
        payloadTarefa.responsavel_id = idAlvo
      }

      const { error: errTarefa } = await supabase
        .from('tarefas_rotinas')
        .update(payloadTarefa)
        .eq('id', tarefa.id)

      if (errTarefa) throw errTarefa

      // 2. Creditar ou debitar moedas no saldo do responsável
      if (idAlvo && moedasDelta > 0) {
        const responsavel = usuarios.find((u) => u.id === idAlvo)
        if (responsavel) {
          const saldoAtual = Number(responsavel.saldo_moedas) || 0
          const novoSaldo = novoStatus
            ? saldoAtual + moedasDelta
            : Math.max(0, saldoAtual - moedasDelta)

          const { error: errSaldo } = await supabase
            .from('usuarios')
            .update({ saldo_moedas: novoSaldo })
            .eq('id', responsavel.id)

          if (errSaldo) {
            console.error('Erro ao atualizar saldo no Supabase:', errSaldo)
          } else {
            // Atualizar estado local dos usuários
            setUsuarios((prev) =>
              prev.map((u) => (u.id === responsavel.id ? { ...u, saldo_moedas: novoSaldo } : u))
            )
          }
        }
      }
    } catch (err: any) {
      console.error('Falha ao atualizar tarefa:', err)
      carregarDados()
    }
  }

  // Manipulação de Rotinas (Criar / Editar / Excluir)
  const toggleDiaSemana = (dia: string) => {
    if (diasSelecionados.includes(dia)) {
      setDiasSelecionados(diasSelecionados.filter((d) => d !== dia))
    } else {
      setDiasSelecionados([...diasSelecionados, dia])
    }
  }

  const abrirCriacaoTarefa = () => {
    setTarefaEditando(null)
    setTitulo('')
    setRecorrencia('diaria')
    setDiasSelecionados([])
    setDiaMes(1)
    setMoedas('10')
    const padrao = membroFiltroId !== 'todos' ? membroFiltroId : (usuarioLogadoId || membrosAtivos[0]?.id || '')
    setResponsavelId(padrao)
    setModalTarefaAberto(true)
  }

  const abrirEdicaoTarefa = (t: Tarefa) => {
    setTarefaEditando(t)
    setTitulo(t.titulo)
    setResponsavelId(t.responsavel_id || '')
    setRecorrencia(t.recorrencia)
    setDiasSelecionados(t.dias_semana ? t.dias_semana.split(', ') : [])
    setDiaMes(t.dia_mes || 1)
    setMoedas(String(t.moedas_recompensa || 0))
    setModalTarefaAberto(true)
  }

  const handleSalvarTarefa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || salvandoTarefa) return

    setSalvandoTarefa(true)
    try {
      const payload: any = {
        titulo: titulo.trim(),
        responsavel_id: responsavelId || null,
        recorrencia,
        moedas_recompensa: parseInt(moedas) || 0,
        esta_concluida: tarefaEditando ? tarefaEditando.esta_concluida : false,
        atualizado_em: new Date().toISOString(),
      }

      if (recorrencia === 'semanal') {
        payload.dias_semana = diasSelecionados.join(', ') || 'Segunda a Sexta'
        payload.dia_mes = null
      } else if (recorrencia === 'mensal') {
        payload.dia_mes = diaMes
        payload.dias_semana = null
      } else {
        payload.dias_semana = null
        payload.dia_mes = null
      }

      if (tarefaEditando) {
        const { error } = await supabase
          .from('tarefas_rotinas')
          .update(payload)
          .eq('id', tarefaEditando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('tarefas_rotinas').insert([payload])
        if (error) throw error
      }

      await carregarDados()
      setModalTarefaAberto(false)
    } catch (err: any) {
      alert('Erro ao salvar tarefa: ' + err.message)
    } finally {
      setSalvandoTarefa(false)
    }
  }

  const excluirTarefa = async (id: string, nome: string) => {
    if (!confirm(`Excluir a rotina "${nome}"?`)) return
    try {
      const { error } = await supabase.from('tarefas_rotinas').delete().eq('id', id)
      if (error) throw error
      setTarefas(tarefas.filter((t) => t.id !== id))
    } catch (err: any) {
      alert('Erro ao excluir tarefa: ' + err.message)
    }
  }

  // Manipulação da Loja de Privilégios
  const abrirCriacaoPrivilegio = () => {
    setPrivilegioEditando(null)
    setPrivTitulo('')
    setPrivDescricao('')
    setPrivCusto('30')
    setPrivIcone('🎮')
    setModalPrivilegioAberto(true)
  }

  const abrirEdicaoPrivilegio = (p: Privilegio) => {
    setPrivilegioEditando(p)
    setPrivTitulo(p.titulo)
    setPrivDescricao(p.descricao || '')
    setPrivCusto(String(p.custo_moedas))
    setPrivIcone(p.icone || '🎮')
    setModalPrivilegioAberto(true)
  }

  const handleSalvarPrivilegio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!privTitulo.trim() || salvandoPrivilegio) return

    setSalvandoPrivilegio(true)
    try {
      const payload: any = {
        titulo: privTitulo.trim(),
        descricao: privDescricao.trim() || null,
        custo_moedas: parseInt(privCusto) || 10,
        icone: privIcone || '🎁',
        ativo: true,
      }

      if (privilegioEditando) {
        const { error } = await supabase
          .from('loja_privilegios')
          .update(payload)
          .eq('id', privilegioEditando.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('loja_privilegios').insert([payload])
        if (error) throw error
      }

      await carregarDados()
      setModalPrivilegioAberto(false)
      alert(`Privilégio ${privilegioEditando ? 'atualizado' : 'cadastrado'} com sucesso!`)
    } catch (err: any) {
      alert('Erro ao salvar privilégio: ' + err.message)
    } finally {
      setSalvandoPrivilegio(false)
    }
  }

  const excluirPrivilegio = async (id: string, titulo: string) => {
    if (!confirm(`Remover a recompensa "${titulo}" da loja?`)) return
    try {
      const { error } = await supabase.from('loja_privilegios').delete().eq('id', id)
      if (error) throw error
      setPrivilegios(privilegios.filter((p) => p.id !== id))
    } catch (err: any) {
      alert('Erro ao excluir recompensa: ' + err.message)
    }
  }

  // Resgate de Privilégio por Membro
  const abrirModalResgate = (p: Privilegio) => {
    setPrivilegioParaResgate(p)
    if (!usuarioResgatandoId && usuarios.length > 0) {
      setUsuarioResgatandoId(usuarios[0].id)
    }
    setModalResgateAberto(true)
  }

  const handleConfirmarResgate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!privilegioParaResgate || !usuarioResgatandoId || processandoResgate) return

    const membro = usuarios.find((u) => u.id === usuarioResgatandoId)
    if (!membro) return

    if ((membro.saldo_moedas || 0) < privilegioParaResgate.custo_moedas) {
      alert(`Saldo insuficiente! ${membro.nome} tem ⭐ ${membro.saldo_moedas || 0} moedas, mas precisa de ⭐ ${privilegioParaResgate.custo_moedas}.`)
      return
    }

    setProcessandoResgate(true)
    try {
      const novoSaldo = (membro.saldo_moedas || 0) - privilegioParaResgate.custo_moedas

      // 1. Debitar saldo do membro
      const { error: errSaldo } = await supabase
        .from('usuarios')
        .update({ saldo_moedas: novoSaldo })
        .eq('id', membro.id)

      if (errSaldo) throw errSaldo

      // 2. Registrar resgate
      const { error: errResgate } = await supabase.from('resgates_privilegios').insert([
        {
          privilegio_id: privilegioParaResgate.id,
          usuario_id: membro.id,
          moedas_gastas: privilegioParaResgate.custo_moedas,
          status: 'aprovado',
        },
      ])

      if (errResgate) throw errResgate

      await carregarDados()
      setModalResgateAberto(false)
      alert(`🎉 Parabéns! ${membro.nome} resgatou "${privilegioParaResgate.titulo}" com sucesso! Novo saldo: ⭐ ${novoSaldo} moedas.`)
    } catch (err: any) {
      alert('Erro ao resgatar recompensa: ' + err.message)
    } finally {
      setProcessandoResgate(false)
    }
  }

  const membrosAtivos = usuarios.filter((u) => u.ativo !== false)

  const tarefasFiltradas = tarefas.filter((t) => {
    if (membroFiltroId === 'todos') return true
    return t.responsavel_id === membroFiltroId
  })

  return (
    <div>
      {/* Topo / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Rotinas & Gamificação Infantil
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Hábitos diários, moedas por tarefas concluídas e loja de privilégios resgatáveis.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link href="/usuarios" className="btn btn-secondary">
            👥 Gerenciar Membros
          </Link>
          {abaAtiva === 'rotinas' && (
            <button type="button" onClick={abrirCriacaoTarefa} className="btn btn-primary">
              ⭐ + Nova Rotina
            </button>
          )}
          {abaAtiva === 'loja' && (
            <button type="button" onClick={abrirCriacaoPrivilegio} className="btn btn-primary">
              🎁 + Novo Privilégio
            </button>
          )}
        </div>
      </div>

      {/* Painel dos Membros da Família (Placar de Moedas) */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Placar de Moedas da Família</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)' }}>
            Clique em um membro para filtrar as rotinas dele
          </span>
        </div>

        {membrosAtivos.length === 0 ? (
          <div style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem' }}>
            Nenhum membro ativo cadastrado.{' '}
            <Link href="/usuarios" style={{ color: 'var(--cor-primaria)', fontWeight: 600 }}>
              Cadastre os membros da família aqui.
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setMembroFiltroId('todos')}
              className={`btn ${membroFiltroId === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              👥 Todos ({tarefas.length})
            </button>

            {membrosAtivos.map((m) => {
              const selecionado = membroFiltroId === m.id
              const tarefasDoMembro = tarefas.filter((t) => t.responsavel_id === m.id)

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMembroFiltroId(selecionado ? 'todos' : m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 16px',
                    borderRadius: 'var(--raio-md)',
                    border: selecionado ? '2px solid var(--cor-primaria)' : '1px solid var(--borda)',
                    backgroundColor: selecionado ? 'var(--cor-primaria-suave)' : 'var(--bg-hover)',
                    cursor: 'pointer',
                    color: 'var(--texto-principal)',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{m.avatar_url || '👤'}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.nome}</div>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>
                      ⭐ {m.saldo_moedas || 0} <span style={{ color: 'var(--texto-secundario)', fontWeight: 400 }}>({tarefasDoMembro.length} tarefas)</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Navegação por Abas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--borda)', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setAbaAtiva('rotinas')}
          className={`btn ${abaAtiva === 'rotinas' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
        >
          📋 Quadro de Rotinas ({tarefasFiltradas.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('loja')}
          className={`btn ${abaAtiva === 'loja' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
        >
          🛍️ Loja de Privilégios ({privilegios.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('historico')}
          className={`btn ${abaAtiva === 'historico' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
        >
          🏆 Histórico de Resgates ({resgates.length})
        </button>
      </div>

      {/* ABA 1: QUADRO DE ROTINAS */}
      {abaAtiva === 'rotinas' && (
        <div>
          {carregando ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
              Carregando tarefas e rotinas...
            </div>
          ) : tarefasFiltradas.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
              Nenhuma rotina encontrada para este filtro. Clique em "⭐ + Nova Rotina" para criar hábitos!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tarefasFiltradas.map((tarefa) => {
                const responsavel = usuarios.find((u) => u.id === tarefa.responsavel_id)

                return (
                  <div
                    key={tarefa.id}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      backgroundColor: tarefa.esta_concluida ? 'var(--bg-hover)' : 'var(--bg-card)',
                      opacity: tarefa.esta_concluida ? 0.75 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={tarefa.esta_concluida}
                        onChange={() => toggleTarefa(tarefa)}
                        style={{
                          width: '22px',
                          height: '22px',
                          cursor: 'pointer',
                          accentColor: 'var(--cor-sucesso)',
                        }}
                      />

                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '1rem',
                            textDecoration: tarefa.esta_concluida ? 'line-through' : 'none',
                            color: tarefa.esta_concluida ? 'var(--texto-secundario)' : 'inherit',
                          }}
                        >
                          {tarefa.titulo}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                          {responsavel && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cor-primaria)' }}>
                              {responsavel.avatar_url || '👤'} {responsavel.nome}
                            </span>
                          )}

                          <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                            {tarefa.recorrencia.toUpperCase()}
                          </span>

                          {tarefa.dias_semana && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>
                              📅 {tarefa.dias_semana}
                            </span>
                          )}

                          {tarefa.dia_mes && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>
                              📅 Todo dia {tarefa.dia_mes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: '#f59e0b',
                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                          padding: '4px 10px',
                          borderRadius: 'var(--raio-full)',
                        }}
                      >
                        +⭐ {tarefa.moedas_recompensa} moedas
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => abrirEdicaoTarefa(tarefa)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirTarefa(tarefa.id, tarefa.titulo)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--cor-perigo)' }}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ABA 2: LOJA DE PRIVILÉGIOS (RECOMPENSAS) */}
      {abaAtiva === 'loja' && (
        <div>
          {privilegios.length === 0 && !carregando ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
              Nenhum privilégio cadastrado na loja ainda. Clique em "🎁 + Novo Privilégio" para criar recompensas como videogame, passeios e filmes!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {privilegios.map((priv) => (
                <div
                  key={priv.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderTop: '4px solid #f59e0b',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ fontSize: '2.5rem' }}>{priv.icone || '🎁'}</div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => abrirEdicaoPrivilegio(priv)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirPrivilegio(priv.id, priv.titulo)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--cor-perigo)' }}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{priv.titulo}</h3>
                    {priv.descricao && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>
                        {priv.descricao}
                      </p>
                    )}
                  </div>

                  <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--borda)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)' }}>Preço de Resgate:</span>
                      <span style={{ fontWeight: 700, fontSize: '1.15rem', color: '#f59e0b' }}>
                        ⭐ {priv.custo_moedas} moedas
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirModalResgate(priv)}
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      🎁 Resgatar Privilégio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA 3: HISTÓRICO DE RESGATES */}
      {abaAtiva === 'historico' && (
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Histórico de Recompensas Conquistadas</h2>

          {resgates.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
              Nenhum resgate de privilégio registrado ainda. Complete tarefas para juntar moedas!
            </div>
          ) : (
            <div className="tabela-container">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Membro da Família</th>
                    <th>Privilégio / Recompensa</th>
                    <th>Moedas Gastas</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resgates.map((r) => (
                    <tr key={r.id}>
                      <td>{new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
                      <td style={{ fontWeight: 600 }}>{r.usuario_nome}</td>
                      <td>
                        <span style={{ marginRight: '6px' }}>{r.privilegio_icone}</span>
                        {r.privilegio_titulo}
                      </td>
                      <td style={{ fontWeight: 700, color: '#f59e0b' }}>-⭐ {r.moedas_gastas}</td>
                      <td>
                        <span className="badge badge-success">APROVADO</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de Criação / Edição de Rotina */}
      {modalTarefaAberto && (
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {tarefaEditando ? '✏️ Editar Rotina' : '⭐ Nova Rotina / Tarefa'}
              </h2>
              <button
                type="button"
                onClick={() => setModalTarefaAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarTarefa} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Título da Tarefa / Hábito</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Escovar os dentes, Arrumar o quarto, Fazer lição de casa"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Responsável</label>
                  <select
                    className="input"
                    value={responsavelId}
                    onChange={(e) => setResponsavelId(e.target.value)}
                  >
                    <option value="">Sem responsável atribuído</option>
                    {membrosAtivos.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.avatar_url || '👤'} {u.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Moedas de Recompensa</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={moedas}
                    onChange={(e) => setMoedas(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Recorrência</label>
                <select
                  className="input"
                  value={recorrencia}
                  onChange={(e) => setRecorrencia(e.target.value as any)}
                >
                  <option value="diaria">Diária (Todos os dias)</option>
                  <option value="semanal">Semanal (Dias específicos)</option>
                  <option value="mensal">Mensal (Dia fixo do mês)</option>
                  <option value="unica">Única</option>
                </select>
              </div>

              {recorrencia === 'semanal' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Selecione os dias da semana:</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {DIAS_DA_SEMANA.map((dia) => {
                      const sel = diasSelecionados.includes(dia.id)
                      return (
                        <button
                          key={dia.id}
                          type="button"
                          onClick={() => toggleDiaSemana(dia.id)}
                          className={`btn ${sel ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          {dia.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {recorrencia === 'mensal' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dia do mês:</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="input"
                    value={diaMes}
                    onChange={(e) => setDiaMes(parseInt(e.target.value) || 1)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalTarefaAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoTarefa}>
                  {salvandoTarefa ? 'Salvando...' : tarefaEditando ? 'Salvar Alterações' : 'Criar Rotina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Privilégio */}
      {modalPrivilegioAberto && (
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
                {privilegioEditando ? '✏️ Editar Recompensa' : '🎁 Nova Recompensa / Privilégio'}
              </h2>
              <button
                type="button"
                onClick={() => setModalPrivilegioAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarPrivilegio} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Título da Recompensa</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: +1h de Videogame, Escolher o Filme, Passeio no Parque"
                  value={privTitulo}
                  onChange={(e) => setPrivTitulo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Descrição (Opcional)</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Detalhes ou regras do privilégio..."
                  value={privDescricao}
                  onChange={(e) => setPrivDescricao(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Custo em Moedas</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={privCusto}
                    onChange={(e) => setPrivCusto(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Emoji / Ícone</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="🎮, 🍕, 🎬, 🍦"
                    value={privIcone}
                    onChange={(e) => setPrivIcone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalPrivilegioAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoPrivilegio}>
                  {salvandoPrivilegio ? 'Salvando...' : privilegioEditando ? 'Salvar Alterações' : 'Cadastrar Privilégio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Resgate de Privilégio */}
      {modalResgateAberto && privilegioParaResgate && (
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
          <div className="card" style={{ width: '100%', maxWidth: '440px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                🎁 Resgatar {privilegioParaResgate.titulo}
              </h2>
              <button
                type="button"
                onClick={() => setModalResgateAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                textAlign: 'center',
                padding: '16px',
                backgroundColor: 'var(--bg-hover)',
                borderRadius: 'var(--raio-md)',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '3rem', marginBottom: '6px' }}>{privilegioParaResgate.icone || '🎁'}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{privilegioParaResgate.titulo}</div>
              <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: '1.1rem', marginTop: '4px' }}>
                ⭐ {privilegioParaResgate.custo_moedas} moedas
              </div>
            </div>

            <form onSubmit={handleConfirmarResgate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Quem está resgatando este privilégio?</label>
                <select
                  className="input"
                  value={usuarioResgatandoId}
                  onChange={(e) => setUsuarioResgatandoId(e.target.value)}
                  required
                >
                  {membrosAtivos.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.avatar_url || '👤'} {u.nome} (Saldo: ⭐ {u.saldo_moedas || 0} moedas)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalResgateAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={processandoResgate}>
                  {processandoResgate ? 'Processando resgate...' : 'Confirmar Resgate 🎉'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
