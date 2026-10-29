'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Usuario {
  id: string
  nome: string
  avatar_url?: string
}

interface ItemRoteiro {
  dia: string
  horario?: string
  titulo: string
  descricao?: string
  local?: string
}

interface Evento {
  id: string
  nome: string
  data_evento: string
  data_fim?: string
  tipo: 'aniversario' | 'viagem' | 'ferias' | 'churrasco' | 'reuniao' | 'outro'
  local?: string
  destino?: string
  descricao?: string
  orcamento_estimado: number
  roteiro_viagem?: ItemRoteiro[]
  google_event_id?: string
  sincronizado_google?: boolean
  criado_em: string
}

interface Convidado {
  id: string
  evento_id: string
  nome: string
  telefone?: string
  status: 'confirmado' | 'pendente' | 'recusado'
  adultos: number
  criancas: number
  restricoes_alimentares?: string
  itens_que_leva?: string
}

interface TarefaEvento {
  id: string
  evento_id: string
  titulo: string
  responsavel_id?: string
  concluida: boolean
  prazo?: string
  criado_em: string
}

interface CotacaoCusto {
  id: string
  evento_id: string
  item_ou_servico: string
  fornecedor: string
  valor: number
  categoria?: string
  status: 'em_analise' | 'aprovada' | 'rejeitada'
  pago?: boolean
  link_anexo?: string
  observacoes?: string
}

const TIPOS_EVENTO: { [k: string]: { label: string; icone: string } } = {
  aniversario: { label: 'Aniversário', icone: '🎂' },
  viagem: { label: 'Viagem', icone: '✈️' },
  ferias: { label: 'Férias', icone: '🏖️' },
  churrasco: { label: 'Churrasco / Almoço', icone: '🥩' },
  reuniao: { label: 'Reunião Familiar', icone: '🤝' },
  outro: { label: 'Outro Evento', icone: '🎉' },
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [eventoAtivoId, setEventoAtivoId] = useState<string>('')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [convidados, setConvidados] = useState<Convidado[]>([])
  const [tarefas, setTarefas] = useState<TarefaEvento[]>([])
  const [custos, setCustos] = useState<CotacaoCusto[]>([])

  const [abaAtiva, setAbaAtiva] = useState<'convidados' | 'tarefas' | 'custos' | 'roteiro'>('convidados')
  const [carregando, setCarregando] = useState(true)

  // Modal Novo / Editar Evento
  const [modalEventoAberto, setModalEventoAberto] = useState(false)
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null)
  const [nomeEv, setNomeEv] = useState('')
  const [tipoEv, setTipoEv] = useState<Evento['tipo']>('aniversario')
  const [dataInicioEv, setDataInicioEv] = useState('')
  const [dataFimEv, setDataFimEv] = useState('')
  const [localEv, setLocalEv] = useState('')
  const [destinoEv, setDestinoEv] = useState('')
  const [descricaoEv, setDescricaoEv] = useState('')
  const [orcamentoEv, setOrcamentoEv] = useState('')
  const [salvandoEvento, setSalvandoEvento] = useState(false)

  // Modal Convidado
  const [modalConvidadoAberto, setModalConvidadoAberto] = useState(false)
  const [convNome, setConvNome] = useState('')
  const [convTelefone, setConvTelefone] = useState('')
  const [convAdultos, setConvAdultos] = useState('1')
  const [convCriancas, setConvCriancas] = useState('0')
  const [convItens, setConvItens] = useState('')
  const [convRestricoes, setConvRestricoes] = useState('')
  const [salvandoConvidado, setSalvandoConvidado] = useState(false)

  // Modal Tarefa do Evento
  const [modalTarefaAberto, setModalTarefaAberto] = useState(false)
  const [tarTitulo, setTarTitulo] = useState('')
  const [tarResponsavelId, setTarResponsavelId] = useState('')
  const [tarPrazo, setTarPrazo] = useState('')
  const [salvandoTarefa, setSalvandoTarefa] = useState(false)

  // Modal Custo / Cotação
  const [modalCustoAberto, setModalCustoAberto] = useState(false)
  const [custoItem, setCustoItem] = useState('')
  const [custoFornecedor, setCustoFornecedor] = useState('')
  const [custoValor, setCustoValor] = useState('')
  const [custoCategoria, setCustoCategoria] = useState('geral')
  const [custoStatus, setCustoStatus] = useState<CotacaoCusto['status']>('em_analise')
  const [custoPago, setCustoPago] = useState(false)
  const [salvandoCusto, setSalvandoCusto] = useState(false)

  // Modal Roteiro de Viagem
  const [modalRoteiroAberto, setModalRoteiroAberto] = useState(false)
  const [rotDia, setRotDia] = useState('Dia 1')
  const [rotHorario, setRotHorario] = useState('09:00')
  const [rotTitulo, setRotTitulo] = useState('')
  const [rotLocal, setRotLocal] = useState('')
  const [rotDescricao, setRotDescricao] = useState('')
  const [salvandoRoteiro, setSalvandoRoteiro] = useState(false)

  // Integração Google Calendar (OAuth 2.0)
  const [googleStatus, setGoogleStatus] = useState<{
    configured: boolean
    connected: boolean
    email?: string
  } | null>(null)
  const [sincronizandoGoogle, setSincronizandoGoogle] = useState(false)

  const eventoAtual = eventos.find((e) => e.id === eventoAtivoId) || eventos[0] || null

  const carregarStatusGoogle = async () => {
    try {
      const res = await fetch('/api/google-calendar/status')
      const data = await res.json()
      setGoogleStatus(data)
    } catch (err) {
      console.error('Erro ao verificar status do Google Calendar:', err)
    }
  }

  const conectarGoogle = async () => {
    try {
      const res = await fetch('/api/google-calendar/auth-url')
      const data = await res.json()
      if (!data.configured) {
        alert(
          'Para conectar com a sua Google Agenda oficial via OAuth 2.0:\n\n' +
          '1. Crie um projeto no Google Cloud Console (https://console.cloud.google.com)\n' +
          '2. Ative a "Google Calendar API"\n' +
          '3. Em "Credenciais", crie um "ID do cliente OAuth 2.0" (aplicativo da Web)\n' +
          '4. Adicione o seguinte URI de redirecionamento autorizado:\n' +
          (data.redirectUri || 'http://localhost:3000/api/google-calendar/callback') + '\n\n' +
          '5. Defina as variáveis no arquivo .env.local:\nGOOGLE_CLIENT_ID=seu_client_id\nGOOGLE_CLIENT_SECRET=seu_client_secret'
        )
        return
      }
      window.location.href = data.url
    } catch (err: any) {
      alert('Erro ao conectar com Google Agenda: ' + err.message)
    }
  }

  const sincronizarGoogle = async () => {
    if (sincronizandoGoogle) return
    setSincronizandoGoogle(true)
    try {
      const res = await fetch('/api/google-calendar/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro na sincronização')
      alert(`Sincronização com o Google Calendar realizada com sucesso!\n\n📥 Importados do Google: ${data.importadosDoGoogle}\n📤 Enviados para o Google: ${data.enviadosParaOGoogle}`)
      await carregarDados()
    } catch (err: any) {
      alert('Erro ao sincronizar com Google Calendar: ' + err.message)
    } finally {
      setSincronizandoGoogle(false)
    }
  }

  const carregarDados = async () => {
    try {
      setCarregando(true)

      // Membros da família para atribuição de tarefas
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('id, nome, avatar_url')
        .order('nome', { ascending: true })

      if (usuariosData) setUsuarios(usuariosData)

      // Eventos
      const { data: eventosData } = await supabase
        .from('eventos')
        .select('*')
        .order('data_evento', { ascending: true })

      if (eventosData && eventosData.length > 0) {
        setEventos(eventosData)
        const idAtivo = eventoAtivoId && eventosData.some((e) => e.id === eventoAtivoId) ? eventoAtivoId : eventosData[0].id
        setEventoAtivoId(idAtivo)
        await carregarDetalhesEvento(idAtivo)
      } else {
        setEventos([])
        setEventoAtivoId('')
        setConvidados([])
        setTarefas([])
        setCustos([])
      }
    } finally {
      setCarregando(false)
    }
  }

  const carregarDetalhesEvento = async (eventoId: string) => {
    try {
      const [resConvs, resTarefas, resCustos] = await Promise.all([
        supabase.from('convidados').select('*').eq('evento_id', eventoId).order('nome', { ascending: true }),
        supabase.from('eventos_tarefas').select('*').eq('evento_id', eventoId).order('concluida', { ascending: true }),
        supabase.from('cotacoes').select('*').eq('evento_id', eventoId).order('valor', { ascending: false }),
      ])

      if (resConvs.data) setConvidados(resConvs.data)
      if (resTarefas.data) setTarefas(resTarefas.data)
      if (resCustos.data) setCustos(resCustos.data)
    } catch (err) {
      console.error('Erro ao buscar detalhes do evento:', err)
    }
  }

  useEffect(() => {
    carregarDados()
    carregarStatusGoogle()

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('google_connected') === 'true') {
        const email = params.get('email')
        alert(`Conta Google conectada com sucesso (${email || ''})! Sincronizando eventos...`)
        sincronizarGoogle()
        window.history.replaceState({}, '', window.location.pathname)
      } else if (params.get('google_error')) {
        alert('Erro na autorização do Google: ' + params.get('google_error'))
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  useEffect(() => {
    if (eventoAtivoId) {
      carregarDetalhesEvento(eventoAtivoId)
    }
  }, [eventoAtivoId])

  // --- CRUD EVENTOS ---
  const abrirCriacaoEvento = () => {
    setEventoEditando(null)
    setNomeEv('')
    setTipoEv('aniversario')
    setDataInicioEv('')
    setDataFimEv('')
    setLocalEv('')
    setDestinoEv('')
    setDescricaoEv('')
    setOrcamentoEv('1500')
    setModalEventoAberto(true)
  }

  const abrirEdicaoEvento = (ev: Evento) => {
    setEventoEditando(ev)
    setNomeEv(ev.nome)
    setTipoEv(ev.tipo || 'outro')
    setDataInicioEv(ev.data_evento ? ev.data_evento.substring(0, 16) : '')
    setDataFimEv(ev.data_fim ? ev.data_fim.substring(0, 16) : '')
    setLocalEv(ev.local || '')
    setDestinoEv(ev.destino || '')
    setDescricaoEv(ev.descricao || '')
    setOrcamentoEv(String(ev.orcamento_estimado || 0))
    setModalEventoAberto(true)
  }

  const handleSalvarEvento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeEv.trim() || !dataInicioEv || salvandoEvento) return

    setSalvandoEvento(true)
    try {
      const payload: any = {
        nome: nomeEv.trim(),
        tipo: tipoEv,
        data_evento: new Date(dataInicioEv).toISOString(),
        data_fim: dataFimEv ? new Date(dataFimEv).toISOString() : null,
        local: localEv.trim() || null,
        destino: destinoEv.trim() || null,
        descricao: descricaoEv.trim() || null,
        orcamento_estimado: parseFloat(orcamentoEv) || 0,
      }

      if (eventoEditando) {
        const { error } = await supabase.from('eventos').update(payload).eq('id', eventoEditando.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('eventos').insert([payload]).select()
        if (error) throw error
        if (data && data.length > 0) {
          setEventoAtivoId(data[0].id)
        }
      }

      await carregarDados()
      setModalEventoAberto(false)
      alert(`Evento ${eventoEditando ? 'atualizado' : 'criado'} com sucesso!`)
    } catch (err: any) {
      alert('Erro ao salvar evento: ' + err.message)
    } finally {
      setSalvandoEvento(false)
    }
  }

  const excluirEvento = async (id: string, nome: string) => {
    if (!confirm(`Deseja excluir o evento "${nome}"? Todos os convidados, tarefas e custos deste evento serão removidos.`)) {
      return
    }

    try {
      const { error } = await supabase.from('eventos').delete().eq('id', id)
      if (error) throw error
      await carregarDados()
    } catch (err: any) {
      alert('Erro ao excluir evento: ' + err.message)
    }
  }

  // --- CONVIDADOS & RSVP ---
  const handleAdicionarConvidado = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventoAtual || !convNome.trim() || salvandoConvidado) return

    setSalvandoConvidado(true)
    try {
      const payload = {
        evento_id: eventoAtual.id,
        nome: convNome.trim(),
        telefone: convTelefone.trim() || null,
        status: 'pendente' as const,
        adultos: parseInt(convAdultos) || 1,
        criancas: parseInt(convCriancas) || 0,
        itens_que_leva: convItens.trim() || null,
        restricoes_alimentares: convRestricoes.trim() || null,
      }

      const { data, error } = await supabase.from('convidados').insert([payload]).select()
      if (error) throw error

      if (data) {
        setConvidados([...convidados, data[0]])
        setConvNome('')
        setConvTelefone('')
        setConvAdultos('1')
        setConvCriancas('0')
        setConvItens('')
        setConvRestricoes('')
        setModalConvidadoAberto(false)
      }
    } catch (err: any) {
      alert('Erro ao adicionar convidado: ' + err.message)
    } finally {
      setSalvandoConvidado(false)
    }
  }

  const alterarStatusRSVP = async (conv: Convidado, novoStatus: Convidado['status']) => {
    try {
      const { error } = await supabase.from('convidados').update({ status: novoStatus }).eq('id', conv.id)
      if (error) throw error
      setConvidados(convidados.map((c) => (c.id === conv.id ? { ...c, status: novoStatus } : c)))
    } catch (err: any) {
      alert('Erro ao atualizar RSVP: ' + err.message)
    }
  }

  const excluirConvidado = async (id: string) => {
    if (!confirm('Remover este convidado da lista?')) return
    try {
      const { error } = await supabase.from('convidados').delete().eq('id', id)
      if (error) throw error
      setConvidados(convidados.filter((c) => c.id !== id))
    } catch (err: any) {
      alert('Erro ao excluir convidado: ' + err.message)
    }
  }

  // --- TAREFAS DO EVENTO ---
  const handleAdicionarTarefa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventoAtual || !tarTitulo.trim() || salvandoTarefa) return

    setSalvandoTarefa(true)
    try {
      const payload = {
        evento_id: eventoAtual.id,
        titulo: tarTitulo.trim(),
        responsavel_id: tarResponsavelId || null,
        concluida: false,
        prazo: tarPrazo || null,
      }

      const { data, error } = await supabase.from('eventos_tarefas').insert([payload]).select()
      if (error) throw error

      if (data) {
        setTarefas([...tarefas, data[0]])
        setTarTitulo('')
        setTarPrazo('')
        setModalTarefaAberto(false)
      }
    } catch (err: any) {
      alert('Erro ao adicionar tarefa: ' + err.message)
    } finally {
      setSalvandoTarefa(false)
    }
  }

  const toggleTarefaEvento = async (tar: TarefaEvento) => {
    const novoStatus = !tar.concluida
    setTarefas(tarefas.map((t) => (t.id === tar.id ? { ...t, concluida: novoStatus } : t)))

    try {
      const { error } = await supabase.from('eventos_tarefas').update({ concluida: novoStatus }).eq('id', tar.id)
      if (error) throw error
    } catch (err: any) {
      console.error('Erro ao atualizar tarefa:', err)
      if (eventoAtivoId) carregarDetalhesEvento(eventoAtivoId)
    }
  }

  const excluirTarefaEvento = async (id: string) => {
    if (!confirm('Excluir esta tarefa do checklist?')) return
    try {
      const { error } = await supabase.from('eventos_tarefas').delete().eq('id', id)
      if (error) throw error
      setTarefas(tarefas.filter((t) => t.id !== id))
    } catch (err: any) {
      alert('Erro ao excluir tarefa: ' + err.message)
    }
  }

  // --- CUSTOS & COTAÇÕES ---
  const handleAdicionarCusto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventoAtual || !custoItem.trim() || !custoValor || salvandoCusto) return

    setSalvandoCusto(true)
    try {
      const payload = {
        evento_id: eventoAtual.id,
        item_ou_servico: custoItem.trim(),
        fornecedor: custoFornecedor.trim() || 'A definir',
        valor: parseFloat(custoValor) || 0,
        categoria: custoCategoria,
        status: custoStatus,
        pago: custoPago,
      }

      const { data, error } = await supabase.from('cotacoes').insert([payload]).select()
      if (error) throw error

      if (data) {
        setCustos([...custos, data[0]])
        setCustoItem('')
        setCustoFornecedor('')
        setCustoValor('')
        setCustoPago(false)
        setModalCustoAberto(false)
      }
    } catch (err: any) {
      alert('Erro ao adicionar custo: ' + err.message)
    } finally {
      setSalvandoCusto(false)
    }
  }

  const alterarStatusCusto = async (c: CotacaoCusto, novoStatus: CotacaoCusto['status']) => {
    try {
      const { error } = await supabase.from('cotacoes').update({ status: novoStatus }).eq('id', c.id)
      if (error) throw error
      setCustos(custos.map((item) => (item.id === c.id ? { ...item, status: novoStatus } : item)))
    } catch (err: any) {
      alert('Erro ao atualizar status do custo: ' + err.message)
    }
  }

  const togglePagoCusto = async (c: CotacaoCusto) => {
    const novoPago = !c.pago
    try {
      const { error } = await supabase.from('cotacoes').update({ pago: novoPago }).eq('id', c.id)
      if (error) throw error
      setCustos(custos.map((item) => (item.id === c.id ? { ...item, pago: novoPago } : item)))
    } catch (err: any) {
      alert('Erro ao atualizar pagamento: ' + err.message)
    }
  }

  const excluirCusto = async (id: string) => {
    if (!confirm('Remover este item de custo?')) return
    try {
      const { error } = await supabase.from('cotacoes').delete().eq('id', id)
      if (error) throw error
      setCustos(custos.filter((c) => c.id !== id))
    } catch (err: any) {
      alert('Erro ao excluir custo: ' + err.message)
    }
  }

  // --- ROTEIRO DE VIAGEM ---
  const handleAdicionarItemRoteiro = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventoAtual || !rotTitulo.trim() || salvandoRoteiro) return

    setSalvandoRoteiro(true)
    try {
      const novoItem: ItemRoteiro = {
        dia: rotDia.trim() || 'Dia 1',
        horario: rotHorario || undefined,
        titulo: rotTitulo.trim(),
        local: rotLocal.trim() || undefined,
        descricao: rotDescricao.trim() || undefined,
      }

      const roteiroAtual = eventoAtual.roteiro_viagem || []
      const novoRoteiro = [...roteiroAtual, novoItem]

      const { error } = await supabase
        .from('eventos')
        .update({ roteiro_viagem: novoRoteiro })
        .eq('id', eventoAtual.id)

      if (error) throw error

      setEventos(eventos.map((ev) => (ev.id === eventoAtual.id ? { ...ev, roteiro_viagem: novoRoteiro } : ev)))
      setRotTitulo('')
      setRotLocal('')
      setRotDescricao('')
      setModalRoteiroAberto(false)
    } catch (err: any) {
      alert('Erro ao adicionar atividade no roteiro: ' + err.message)
    } finally {
      setSalvandoRoteiro(false)
    }
  }

  const excluirItemRoteiro = async (index: number) => {
    if (!eventoAtual) return
    const roteiroAtual = eventoAtual.roteiro_viagem || []
    const novoRoteiro = roteiroAtual.filter((_, i) => i !== index)

    try {
      const { error } = await supabase
        .from('eventos')
        .update({ roteiro_viagem: novoRoteiro })
        .eq('id', eventoAtual.id)

      if (error) throw error

      setEventos(eventos.map((ev) => (ev.id === eventoAtual.id ? { ...ev, roteiro_viagem: novoRoteiro } : ev)))
    } catch (err: any) {
      alert('Erro ao excluir item do roteiro: ' + err.message)
    }
  }

  // Cálculos consolidados
  const totalConfirmados = convidados.filter((c) => c.status === 'confirmado')
  const totalAdultosConfirmados = totalConfirmados.reduce((acc, c) => acc + (c.adultos || 1), 0)
  const totalCriancasConfirmadas = totalConfirmados.reduce((acc, c) => acc + (c.criancas || 0), 0)
  const totalPessoasConfirmadas = totalAdultosConfirmados + totalCriancasConfirmadas

  const totalPendentes = convidados.filter((c) => c.status === 'pendente').length
  const totalRecusados = convidados.filter((c) => c.status === 'recusado').length

  const tarefasConcluidas = tarefas.filter((t) => t.concluida).length
  const progressoTarefas = tarefas.length > 0 ? Math.round((tarefasConcluidas / tarefas.length) * 100) : 0

  const custosAprovados = custos.filter((c) => c.status === 'aprovada')
  const totalGastoAprovado = custosAprovados.reduce((acc, c) => acc + Number(c.valor || 0), 0)
  const totalJaPago = custos.filter((c) => c.pago).reduce((acc, c) => acc + Number(c.valor || 0), 0)

  return (
    <div>
      {/* Topo / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Planejamento de Eventos, Viagens & Festas
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Lista de convidados com RSVP, checklists de preparação, orçamento e integração com Google Calendar.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {googleStatus?.connected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-success" title={`Conectado à Google Agenda (${googleStatus.email})`}>
                🟢 Google Calendar: {googleStatus.email}
              </span>
              <button
                type="button"
                onClick={sincronizarGoogle}
                disabled={sincronizandoGoogle}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
              >
                {sincronizandoGoogle ? '🔄 Sincronizando...' : '🔄 Sincronizar Google'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={conectarGoogle}
              className="btn btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              📅 Conectar Google Agenda
            </button>
          )}

          <button type="button" onClick={abrirCriacaoEvento} className="btn btn-primary">
            🎉 + Novo Evento / Viagem
          </button>
        </div>
      </div>

      {/* Seletor de Eventos Cadastrados */}
      <div style={{ marginBottom: '28px' }}>
        {eventos.length === 0 && !carregando ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--texto-secundario)' }}>
            Nenhum evento cadastrado ainda. Clique em "🎉 + Novo Evento / Viagem" para começar a planejar aniversários, churrascos ou viagens de férias!
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '6px' }}>
            {eventos.map((ev) => {
              const selecionado = eventoAtual?.id === ev.id
              const tipoInfo = TIPOS_EVENTO[ev.tipo] || TIPOS_EVENTO.outro

              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setEventoAtivoId(ev.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 18px',
                    borderRadius: 'var(--raio-md)',
                    border: selecionado ? '2px solid var(--cor-primaria)' : '1px solid var(--borda)',
                    backgroundColor: selecionado ? 'var(--cor-primaria-suave)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    color: 'var(--texto-principal)',
                    whiteSpace: 'nowrap',
                    minWidth: '220px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '1.75rem' }}>{tipoInfo.icone}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ev.nome}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                      📅 {new Date(ev.data_evento).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Painel do Evento Selecionado */}
      {eventoAtual && (
        <>
          <div className="card" style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge badge-primary">
                    {TIPOS_EVENTO[eventoAtual.tipo]?.icone} {TIPOS_EVENTO[eventoAtual.tipo]?.label}
                  </span>
                  {eventoAtual.data_fim && (
                    <span className="badge badge-secondary">
                      Até {new Date(eventoAtual.data_fim).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{eventoAtual.nome}</h2>

                <div style={{ display: 'flex', gap: '16px', color: 'var(--texto-secundario)', fontSize: '0.85rem', marginTop: '6px', flexWrap: 'wrap' }}>
                  <span>📅 <strong>Data:</strong> {new Date(eventoAtual.data_evento).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  {eventoAtual.local && <span>📍 <strong>Local:</strong> {eventoAtual.local}</span>}
                  {eventoAtual.destino && <span>🗺️ <strong>Destino:</strong> {eventoAtual.destino}</span>}
                </div>

                {eventoAtual.descricao && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', marginTop: '8px' }}>
                    {eventoAtual.descricao}
                  </p>
                )}
              </div>

              {/* Botões de Ação do Evento */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => abrirEdicaoEvento(eventoAtual)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                >
                  ✏️ Editar Evento
                </button>
                <button
                  type="button"
                  onClick={() => excluirEvento(eventoAtual.id, eventoAtual.nome)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--cor-perigo)' }}
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>

            {/* Métricas Rápidas do Evento */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--borda)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Presenças Confirmadas</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cor-sucesso)', marginTop: '2px' }}>
                  {totalPessoasConfirmadas} pessoas
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--texto-secundario)' }}>
                  {totalAdultosConfirmados} adultos, {totalCriancasConfirmadas} crianças
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Checklist de Preparação</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cor-primaria)', marginTop: '2px' }}>
                  {progressoTarefas}% concluído
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--texto-secundario)' }}>
                  {tarefasConcluidas} de {tarefas.length} tarefas
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Orçamento Previsto</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                  R$ {Number(eventoAtual.orcamento_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--texto-secundario)' }}>
                  Gasto Aprovado: R$ {totalGastoAprovado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Total Pago até o momento</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cor-sucesso)', marginTop: '2px' }}>
                  R$ {totalJaPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--texto-secundario)' }}>
                  Pendente: R$ {Math.max(0, totalGastoAprovado - totalJaPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Abas do Evento */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--borda)', paddingBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setAbaAtiva('convidados')}
              className={`btn ${abaAtiva === 'convidados' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 18px', fontSize: '0.9rem' }}
            >
              👥 Convidados & RSVP ({convidados.length})
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('tarefas')}
              className={`btn ${abaAtiva === 'tarefas' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 18px', fontSize: '0.9rem' }}
            >
              ✅ Checklist de Tarefas ({tarefas.length})
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('custos')}
              className={`btn ${abaAtiva === 'custos' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 18px', fontSize: '0.9rem' }}
            >
              💰 Custos & Cotações ({custos.length})
            </button>
            {(eventoAtual.tipo === 'viagem' || eventoAtual.tipo === 'ferias') && (
              <button
                type="button"
                onClick={() => setAbaAtiva('roteiro')}
                className={`btn ${abaAtiva === 'roteiro' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 18px', fontSize: '0.9rem' }}
              >
                🗺️ Roteiro da Viagem ({eventoAtual.roteiro_viagem?.length || 0})
              </button>
            )}
          </div>

          {/* ABA 1: CONVIDADOS & RSVP */}
          {abaAtiva === 'convidados' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Lista de Convidados & Confirmação de Presença</h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', marginTop: '4px' }}>
                    <span style={{ color: 'var(--cor-sucesso)', fontWeight: 600 }}>✓ {totalConfirmados.length} confirmados</span>
                    <span style={{ color: 'var(--cor-alerta)', fontWeight: 600 }}>⏳ {totalPendentes} pendentes</span>
                    <span style={{ color: 'var(--cor-perigo)', fontWeight: 600 }}>✕ {totalRecusados} recusados</span>
                  </div>
                </div>

                <button type="button" onClick={() => setModalConvidadoAberto(true)} className="btn btn-primary">
                  👤 + Adicionar Convidado
                </button>
              </div>

              {convidados.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
                  Nenhum convidado adicionado à lista ainda. Clique em "+ Adicionar Convidado".
                </div>
              ) : (
                <div className="tabela-container">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>WhatsApp / Telefone</th>
                        <th>Pessoas</th>
                        <th>O que leva?</th>
                        <th>Restrições</th>
                        <th>Status RSVP</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {convidados.map((c) => {
                        const telLimpo = (c.telefone || '').replace(/\D/g, '')

                        return (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 600 }}>{c.nome}</td>
                            <td>
                              {c.telefone ? (
                                <a
                                  href={`https://wa.me/55${telLimpo}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ color: 'var(--cor-sucesso)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  💬 {c.telefone}
                                </a>
                              ) : (
                                <span style={{ color: 'var(--texto-secundario)', fontSize: '0.8rem' }}>-</span>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: '0.85rem' }}>
                                {c.adultos || 1} {c.adultos === 1 ? 'adulto' : 'adultos'}
                                {c.criancas > 0 && `, ${c.criancas} ${c.criancas === 1 ? 'criança' : 'crianças'}`}
                              </span>
                            </td>
                            <td>{c.itens_que_leva || <span style={{ color: 'var(--texto-secundario)', fontSize: '0.8rem' }}>-</span>}</td>
                            <td>
                              {c.restricoes_alimentares ? (
                                <span style={{ color: 'var(--cor-alerta)', fontSize: '0.85rem' }}>
                                  ⚠️ {c.restricoes_alimentares}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--texto-secundario)', fontSize: '0.8rem' }}>Nenhuma</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => alterarStatusRSVP(c, 'confirmado')}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 'var(--raio-sm)',
                                    fontSize: '0.75rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: c.status === 'confirmado' ? 'var(--cor-sucesso)' : 'var(--bg-hover)',
                                    color: c.status === 'confirmado' ? '#fff' : 'var(--texto-secundario)',
                                    fontWeight: c.status === 'confirmado' ? 700 : 400,
                                  }}
                                >
                                  Confirmado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => alterarStatusRSVP(c, 'pendente')}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 'var(--raio-sm)',
                                    fontSize: '0.75rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: c.status === 'pendente' ? 'var(--cor-alerta)' : 'var(--bg-hover)',
                                    color: c.status === 'pendente' ? '#fff' : 'var(--texto-secundario)',
                                    fontWeight: c.status === 'pendente' ? 700 : 400,
                                  }}
                                >
                                  Pendente
                                </button>
                                <button
                                  type="button"
                                  onClick={() => alterarStatusRSVP(c, 'recusado')}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: 'var(--raio-sm)',
                                    fontSize: '0.75rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: c.status === 'recusado' ? 'var(--cor-perigo)' : 'var(--bg-hover)',
                                    color: c.status === 'recusado' ? '#fff' : 'var(--texto-secundario)',
                                    fontWeight: c.status === 'recusado' ? 700 : 400,
                                  }}
                                >
                                  Recusado
                                </button>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => excluirConvidado(c.id)}
                                className="btn btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--cor-perigo)' }}
                                title="Remover"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: CHECKLIST DE TAREFAS */}
          {abaAtiva === 'tarefas' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Checklist de Preparação do Evento</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                    Divida as tarefas entre os membros da família para tudo ficar pronto a tempo.
                  </p>
                </div>

                <button type="button" onClick={() => setModalTarefaAberto(true)} className="btn btn-primary">
                  ✅ + Nova Tarefa
                </button>
              </div>

              {tarefas.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
                  Nenhuma tarefa cadastrada no checklist. Clique em "+ Nova Tarefa" (ex: Comprar bolo, Fazer as malas, Reservar hotel).
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tarefas.map((tar) => {
                    const resp = usuarios.find((u) => u.id === tar.responsavel_id)

                    return (
                      <div
                        key={tar.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 'var(--raio-md)',
                          backgroundColor: tar.concluida ? 'var(--bg-hover)' : 'var(--bg-card)',
                          border: '1px solid var(--borda)',
                          opacity: tar.concluida ? 0.7 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={tar.concluida}
                            onChange={() => toggleTarefaEvento(tar)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--cor-sucesso)' }}
                          />

                          <div>
                            <span
                              style={{
                                fontWeight: 600,
                                fontSize: '0.95rem',
                                textDecoration: tar.concluida ? 'line-through' : 'none',
                              }}
                            >
                              {tar.titulo}
                            </span>

                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                              {resp && (
                                <span style={{ color: 'var(--cor-primaria)', fontWeight: 600 }}>
                                  {resp.avatar_url || '👤'} {resp.nome}
                                </span>
                              )}
                              {tar.prazo && <span>Prazo: {new Date(tar.prazo).toLocaleDateString('pt-BR')}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => excluirTarefaEvento(tar.id)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--cor-perigo)' }}
                          title="Excluir tarefa"
                        >
                          🗑️
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 3: CUSTOS & COTAÇÕES */}
          {abaAtiva === 'custos' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Orçamento, Cotações & Despesas</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                    Compare fornecedores, aprove cotações e controle os pagamentos realizados.
                  </p>
                </div>

                <button type="button" onClick={() => setModalCustoAberto(true)} className="btn btn-primary">
                  💰 + Novo Custo / Cotação
                </button>
              </div>

              {custos.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
                  Nenhum custo ou cotação registrada ainda.
                </div>
              ) : (
                <div className="tabela-container">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Item / Serviço</th>
                        <th>Fornecedor</th>
                        <th>Categoria</th>
                        <th>Valor</th>
                        <th>Status Cotação</th>
                        <th>Pagamento</th>
                        <th style={{ textAlign: 'right' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {custos.map((c) => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.item_ou_servico}</td>
                          <td>{c.fornecedor}</td>
                          <td>
                            <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                              {c.categoria || 'geral'}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, fontSize: '1rem' }}>
                            R$ {Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => alterarStatusCusto(c, 'aprovada')}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 'var(--raio-sm)',
                                  fontSize: '0.75rem',
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: c.status === 'aprovada' ? 'var(--cor-sucesso)' : 'var(--bg-hover)',
                                  color: c.status === 'aprovada' ? '#fff' : 'var(--texto-secundario)',
                                  fontWeight: c.status === 'aprovada' ? 700 : 400,
                                }}
                              >
                                Aprovada
                              </button>
                              <button
                                type="button"
                                onClick={() => alterarStatusCusto(c, 'em_analise')}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: 'var(--raio-sm)',
                                  fontSize: '0.75rem',
                                  border: 'none',
                                  cursor: 'pointer',
                                  backgroundColor: c.status === 'em_analise' ? 'var(--cor-alerta)' : 'var(--bg-hover)',
                                  color: c.status === 'em_analise' ? '#fff' : 'var(--texto-secundario)',
                                  fontWeight: c.status === 'em_analise' ? 700 : 400,
                                }}
                              >
                                Em Análise
                              </button>
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => togglePagoCusto(c)}
                              className={`badge ${c.pago ? 'badge-success' : 'badge-warning'}`}
                              style={{ cursor: 'pointer', border: 'none' }}
                            >
                              {c.pago ? '✓ PAGO' : 'PENDENTE'}
                            </button>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => excluirCusto(c.id)}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--cor-perigo)' }}
                              title="Remover"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ABA 4: ROTEIRO DE VIAGEM (SE FOR VIAGEM OU FÉRIAS) */}
          {abaAtiva === 'roteiro' && (eventoAtual.tipo === 'viagem' || eventoAtual.tipo === 'ferias') && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Roteiro Dia a Dia da Viagem</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                    Cronograma de passeios, voos, check-in e atividades planejadas para a família.
                  </p>
                </div>

                <button type="button" onClick={() => setModalRoteiroAberto(true)} className="btn btn-primary">
                  🗺️ + Adicionar Atividade
                </button>
              </div>

              {(!eventoAtual.roteiro_viagem || eventoAtual.roteiro_viagem.length === 0) ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
                  Nenhuma atividade cadastrada no roteiro ainda. Clique em "+ Adicionar Atividade" para montar a programação diária!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {eventoAtual.roteiro_viagem.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--raio-md)',
                        backgroundColor: 'var(--bg-hover)',
                        borderLeft: '4px solid var(--cor-primaria)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '4px' }}>
                          <span className="badge badge-primary">{item.dia}</span>
                          {item.horario && <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>⏰ {item.horario}</span>}
                          {item.local && <span style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)' }}>📍 {item.local}</span>}
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{item.titulo}</h4>
                        {item.descricao && (
                          <p style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>
                            {item.descricao}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => excluirItemRoteiro(index)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--cor-perigo)' }}
                        title="Remover do roteiro"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Novo / Editar Evento */}
      {modalEventoAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '540px', backgroundColor: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {eventoEditando ? '✏️ Editar Evento / Viagem' : '🎉 Novo Evento ou Viagem'}
              </h2>
              <button type="button" onClick={() => setModalEventoAberto(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}>✕</button>
            </div>

            <form onSubmit={handleSalvarEvento} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome do Evento / Viagem</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Aniversário da Sofia, Férias em Fortaleza, Churrasco de Domingo"
                  value={nomeEv}
                  onChange={(e) => setNomeEv(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de Evento</label>
                  <select className="input" value={tipoEv} onChange={(e) => setTipoEv(e.target.value as any)}>
                    <option value="aniversario">🎂 Aniversário</option>
                    <option value="viagem">✈️ Viagem</option>
                    <option value="ferias">🏖️ Férias</option>
                    <option value="churrasco">🥩 Churrasco / Almoço</option>
                    <option value="reuniao">🤝 Reunião Familiar</option>
                    <option value="outro">🎉 Outro</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Orçamento Estimado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={orcamentoEv}
                    onChange={(e) => setOrcamentoEv(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Data e Hora de Início</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={dataInicioEv}
                    onChange={(e) => setDataInicioEv(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Data de Término (Opcional)</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={dataFimEv}
                    onChange={(e) => setDataFimEv(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Local / Espaço</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Salão de Festas, Casa"
                    value={localEv}
                    onChange={(e) => setLocalEv(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Destino (se viagem)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Fortaleza - CE, Paris"
                    value={destinoEv}
                    onChange={(e) => setDestinoEv(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Descrição / Observações</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Detalhes sobre o evento..."
                  value={descricaoEv}
                  onChange={(e) => setDescricaoEv(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalEventoAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoEvento}>
                  {salvandoEvento ? 'Salvando...' : eventoEditando ? 'Salvar Alterações' : 'Criar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar Convidado */}
      {modalConvidadoAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>👤 Convidar Amigo ou Familiar</h2>
              <button type="button" onClick={() => setModalConvidadoAberto(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}>✕</button>
            </div>

            <form onSubmit={handleAdicionarConvidado} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome Completo</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Tio Carlos & Família"
                  value={convNome}
                  onChange={(e) => setConvNome(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="(91) 9...."
                    value={convTelefone}
                    onChange={(e) => setConvTelefone(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Itens que leva</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Sobremesa, Refrigerante"
                    value={convItens}
                    onChange={(e) => setConvItens(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantidade de Adultos</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={convAdultos}
                    onChange={(e) => setConvAdultos(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Quantidade de Crianças</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={convCriancas}
                    onChange={(e) => setConvCriancas(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Restrições Alimentares / Observações</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Sem glúten, vegetariano..."
                  value={convRestricoes}
                  onChange={(e) => setConvRestricoes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalConvidadoAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoConvidado}>
                  {salvandoConvidado ? 'Adicionando...' : 'Adicionar à Lista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar Tarefa do Evento */}
      {modalTarefaAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '460px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>✅ Nova Tarefa de Preparação</h2>
              <button type="button" onClick={() => setModalTarefaAberto(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}>✕</button>
            </div>

            <form onSubmit={handleAdicionarTarefa} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Descrição da Tarefa</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Comprar descartáveis, Reservar o bolo, Fazer malas"
                  value={tarTitulo}
                  onChange={(e) => setTarTitulo(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Membro Responsável</label>
                  <select className="input" value={tarResponsavelId} onChange={(e) => setTarResponsavelId(e.target.value)}>
                    <option value="">Sem responsável atribuído</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.avatar_url || '👤'} {u.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Prazo Limite</label>
                  <input
                    type="date"
                    className="input"
                    value={tarPrazo}
                    onChange={(e) => setTarPrazo(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalTarefaAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoTarefa}>
                  {salvandoTarefa ? 'Salvando...' : 'Adicionar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar Custo / Cotação */}
      {modalCustoAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>💰 Novo Custo ou Cotação</h2>
              <button type="button" onClick={() => setModalCustoAberto(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}>✕</button>
            </div>

            <form onSubmit={handleAdicionarCusto} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Item ou Serviço</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Bolo Temático, Aluguel do Salão, Passagens Aéreas"
                  value={custoItem}
                  onChange={(e) => setCustoItem(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Fornecedor / Empresa</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Doceria da Ana, Pousada Mar"
                    value={custoFornecedor}
                    onChange={(e) => setCustoFornecedor(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    value={custoValor}
                    onChange={(e) => setCustoValor(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Categoria</label>
                  <select className="input" value={custoCategoria} onChange={(e) => setCustoCategoria(e.target.value)}>
                    <option value="alimentacao">Alimentação & Bebidas</option>
                    <option value="decoracao">Decoração</option>
                    <option value="transporte">Transporte / Passagens</option>
                    <option value="hospedagem">Hospedagem / Hotel</option>
                    <option value="servicos">Serviços / Fotografia</option>
                    <option value="geral">Geral / Outro</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status da Cotação</label>
                  <select className="input" value={custoStatus} onChange={(e) => setCustoStatus(e.target.value as any)}>
                    <option value="aprovada">Aprovada (Confirmado)</option>
                    <option value="em_analise">Em Análise (Orçamento)</option>
                    <option value="rejeitada">Rejeitada</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="chkPago"
                  checked={custoPago}
                  onChange={(e) => setCustoPago(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-sucesso)' }}
                />
                <label htmlFor="chkPago" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                  Este item já foi pago
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalCustoAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoCusto}>
                  {salvandoCusto ? 'Salvando...' : 'Adicionar Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar Atividade ao Roteiro de Viagem */}
      {modalRoteiroAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>🗺️ Adicionar Atividade ao Roteiro</h2>
              <button type="button" onClick={() => setModalRoteiroAberto(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}>✕</button>
            </div>

            <form onSubmit={handleAdicionarItemRoteiro} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dia do Roteiro</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Ex: Dia 1, Sexta, 15/11"
                    value={rotDia}
                    onChange={(e) => setRotDia(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Horário Previsto</label>
                  <input
                    type="time"
                    className="input"
                    value={rotHorario}
                    onChange={(e) => setRotHorario(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Título da Atividade</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Voo Belém -> Fortaleza, Passeio de Barco, Check-in no Hotel"
                  value={rotTitulo}
                  onChange={(e) => setRotTitulo(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Local / Endereço</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Praia do Futuro, Aeroporto Internacional"
                  value={rotLocal}
                  onChange={(e) => setRotLocal(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Observações / Detalhes</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Ex: Levar protetor, voucher no e-mail, confirmar reserva..."
                  value={rotDescricao}
                  onChange={(e) => setRotDescricao(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalRoteiroAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoRoteiro}>
                  {salvandoRoteiro ? 'Salvando...' : 'Adicionar ao Roteiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
