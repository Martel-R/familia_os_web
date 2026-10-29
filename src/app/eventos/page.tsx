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
  convite_enviado_em?: string
  status_envio?: string
  resposta_texto?: string
  mensagem_id?: string
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

interface ContatoAgenda {
  id: string
  nome: string
  especialidade?: string
  telefone: string
  email?: string
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
  const [contatosAgenda, setContatosAgenda] = useState<ContatoAgenda[]>([])

  // Modal e Seleção em Lote de Convidados a partir da Agenda
  const [modoConvidado, setModoConvidado] = useState<'contatos' | 'manual'>('contatos')
  const [buscaContatoConv, setBuscaContatoConv] = useState('')
  const [contatosSelecionados, setContatosSelecionados] = useState<{ [id: string]: boolean }>({})
  const [salvandoContatosLote, setSalvandoContatosLote] = useState(false)

  // Navegação Principal da Tela
  const [abaPrincipal, setAbaPrincipal] = useState<'calendario' | 'planejamento'>('calendario')

  // Estados do Calendário Familiar
  const [mesAtual, setMesAtual] = useState<Date>(new Date(2026, 9, 1))
  const [hojeFormatado, setHojeFormatado] = useState<string>('2026-10-29')
  const [visualizacaoCalendario, setVisualizacaoCalendario] = useState<'mes' | 'lista'>('mes')
  const [consultasSaude, setConsultasSaude] = useState<any[]>([])
  const [itemSelecionadoCalendario, setItemSelecionadoCalendario] = useState<{
    tipo: 'evento' | 'saude'
    dados: any
  } | null>(null)

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
      const originParam = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''
      const res = await fetch(`/api/google-calendar/auth-url?origin=${originParam}`)
      const data = await res.json()
      if (!data.configured) {
        alert(
          'Para conectar com a sua Google Agenda oficial via OAuth 2.0:\n\n' +
          '1. Crie um projeto no Google Cloud Console (https://console.cloud.google.com)\n' +
          '2. Ative a "Google Calendar API"\n' +
          '3. Em "Credenciais", crie um "ID do cliente OAuth 2.0" (aplicativo da Web)\n' +
          '4. Adicione o seguinte URI de redirecionamento autorizado:\n' +
          (data.redirectUri || 'https://familia.martel.page/api/google-calendar/callback') + '\n\n' +
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

  // --- INTEGRAÇÃO WHATSAPP (EVOLUTION API) ---
  const [modalWhatsappAberto, setModalWhatsappAberto] = useState(false)
  const [whatsServerUrl, setWhatsServerUrl] = useState('')
  const [whatsApiKey, setWhatsApiKey] = useState('')
  const [whatsInstanceName, setWhatsInstanceName] = useState('familia-os')
  const [whatsStatus, setWhatsStatus] = useState<string>('desconectado')
  const [whatsQrCode, setWhatsQrCode] = useState<string | null>(null)
  const [salvandoWhatsConfig, setSalvandoWhatsConfig] = useState(false)
  const [conectandoWhats, setConectandoWhats] = useState(false)
  const [enviandoConviteId, setEnviandoConviteId] = useState<string | null>(null)
  const [enviandoTodosConvites, setEnviandoTodosConvites] = useState(false)

  const carregarConfigWhatsapp = async () => {
    try {
      const res = await fetch('/api/whatsapp/config')
      const data = await res.json()
      if (data.configurado) {
        setWhatsServerUrl(data.serverUrl || '')
        setWhatsApiKey(data.apiKey || '')
        setWhatsInstanceName(data.instanceName || 'familia-os')
        checarStatusWhatsapp()
      }
    } catch (err) {
      console.error('Erro ao buscar config WhatsApp:', err)
    }
  }

  const salvarConfigWhatsapp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!whatsServerUrl || !whatsApiKey || !whatsInstanceName || salvandoWhatsConfig) return

    setSalvandoWhatsConfig(true)
    try {
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverUrl: whatsServerUrl,
          apiKey: whatsApiKey,
          instanceName: whatsInstanceName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar configurações.')
      alert('Configurações da Evolution API salvas com sucesso!')
      await checarStatusWhatsapp()
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setSalvandoWhatsConfig(false)
    }
  }

  const criarInstanciaWhatsapp = async () => {
    try {
      setConectandoWhats(true)
      const res = await fetch('/api/whatsapp/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'create' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      alert(`Instância "${whatsInstanceName}" criada com sucesso na Evolution API! Agora clique em "Conectar / Gerar QR Code".`)
      await conectarWhatsappQrCode()
    } catch (err: any) {
      alert('Erro ao criar instância: ' + err.message)
    } finally {
      setConectandoWhats(false)
    }
  }

  const conectarWhatsappQrCode = async () => {
    try {
      setConectandoWhats(true)
      const res = await fetch('/api/whatsapp/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'connect' }),
      })
      const data = await res.json()
      if (data.qrcode?.base64) {
        setWhatsQrCode(data.qrcode.base64)
      } else if (data.base64) {
        setWhatsQrCode(data.base64)
      } else if (data.code) {
        setWhatsQrCode(data.code)
      } else {
        alert(data.message || 'Status retornado: ' + JSON.stringify(data))
      }
      await checarStatusWhatsapp()
    } catch (err: any) {
      alert('Erro ao gerar QR Code: ' + err.message)
    } finally {
      setConectandoWhats(false)
    }
  }

  const checarStatusWhatsapp = async () => {
    try {
      const res = await fetch('/api/whatsapp/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'status' }),
      })
      const data = await res.json()
      const estado = data?.instance?.state || data?.state || 'desconectado'
      setWhatsStatus(estado)
      if (estado === 'open') {
        setWhatsQrCode(null)
      }
    } catch {
      setWhatsStatus('desconectado')
    }
  }

  const enviarConviteWhatsapp = async (convidadoId: string) => {
    setEnviandoConviteId(convidadoId)
    try {
      const res = await fetch('/api/whatsapp/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ convidadoId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar convite.')
      alert('📲 Convite enviado com sucesso via WhatsApp!')
      if (eventoAtual) await carregarDetalhesEvento(eventoAtual.id)
    } catch (err: any) {
      alert('Erro no envio via WhatsApp: ' + err.message)
    } finally {
      setEnviandoConviteId(null)
    }
  }

  const enviarTodosConvitesWhatsapp = async () => {
    if (!eventoAtual || enviandoTodosConvites) return
    const pendentesComTelefone = convidados.filter((c) => c.status === 'pendente' && c.telefone)
    if (pendentesComTelefone.length === 0) {
      alert('Não há convidados pendentes com número de telefone cadastrado neste evento.')
      return
    }

    if (!confirm(`Deseja enviar o convite de WhatsApp para todos os ${pendentesComTelefone.length} convidados pendentes?`)) {
      return
    }

    setEnviandoTodosConvites(true)
    try {
      const res = await fetch('/api/whatsapp/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventoId: eventoAtual.id, todosPendentes: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro no envio em lote.')
      alert(`🎉 Sucesso! Convites disparados para ${data.total} convidados via Evolution API.`)
      await carregarDetalhesEvento(eventoAtual.id)
    } catch (err: any) {
      alert('Erro no envio em lote: ' + err.message)
    } finally {
      setEnviandoTodosConvites(false)
    }
  }

  const carregarDados = async () => {
    try {
      setCarregando(true)

      // Membros da família para atribuição de tarefas
      const { data: usuariosData } = await supabase
        .from('usuarios')
        .select('id, nome, avatar_url, ativo')
        .eq('ativo', true)
        .order('nome', { ascending: true })

      if (usuariosData) setUsuarios(usuariosData)

      // Eventos, Consultas de Saúde e Agenda de Contatos
      const [resEventos, resSaude, resContatos] = await Promise.all([
        supabase.from('eventos').select('*').order('data_evento', { ascending: true }),
        supabase.from('saude_consultas_exames').select('*').order('data_agendada', { ascending: true }),
        supabase.from('agenda_contatos').select('id, nome, especialidade, telefone, email').order('nome', { ascending: true }),
      ])

      if (resSaude.data) setConsultasSaude(resSaude.data)
      if (resContatos.data) setContatosAgenda(resContatos.data)

      const eventosData = resEventos.data
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

  const handleAdicionarContatosLote = async () => {
    if (!eventoAtual || salvandoContatosLote) return
    const ids = Object.keys(contatosSelecionados).filter((id) => contatosSelecionados[id])
    if (ids.length === 0) return alert('Selecione ao menos um contato da lista para adicionar.')

    setSalvandoContatosLote(true)
    try {
      const nomesJaAdicionados = new Set(convidados.map((c) => c.nome.toLowerCase().trim()))
      const contatosParaAdicionar = contatosAgenda.filter((c) => ids.includes(c.id))

      const novosPayloads = contatosParaAdicionar
        .filter((c) => !nomesJaAdicionados.has(c.nome.toLowerCase().trim()))
        .map((c) => ({
          evento_id: eventoAtual.id,
          nome: c.nome.trim(),
          telefone: c.telefone ? c.telefone.trim() : null,
          status: 'pendente' as const,
          adultos: 1,
          criancas: 0,
        }))

      if (novosPayloads.length === 0) {
        alert('Todos os contatos selecionados já estão na lista de convidados deste evento!')
        setModalConvidadoAberto(false)
        return
      }

      const { data, error } = await supabase.from('convidados').insert(novosPayloads).select()
      if (error) throw error

      if (data) {
        setConvidados([...convidados, ...data])
        setContatosSelecionados({})
        setModalConvidadoAberto(false)
        alert(`🎉 ${data.length} contatos adicionados à lista de convidados com sucesso!`)
      }
    } catch (err: any) {
      alert('Erro ao adicionar contatos: ' + err.message)
    } finally {
      setSalvandoContatosLote(false)
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

  // --- LÓGICA DO CALENDÁRIO FAMILIAR ---
  const mesAnterior = () => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1))
  }

  const proximoMes = () => {
    setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1))
  }

  const irParaHoje = () => {
    const agora = new Date()
    setMesAtual(new Date(agora.getFullYear(), agora.getMonth(), 1))
  }

  const anoAtualCal = mesAtual.getFullYear()
  const mesAtualCal = mesAtual.getMonth()
  const primeiroDiaSemana = new Date(anoAtualCal, mesAtualCal, 1).getDay()
  const totalDiasMes = new Date(anoAtualCal, mesAtualCal + 1, 0).getDate()
  const totalDiasMesAnterior = new Date(anoAtualCal, mesAtualCal, 0).getDate()

  interface CelulaCalendario {
    dia: number
    dataStr: string
    ehMesAtual: boolean
    ehHoje: boolean
  }

  const celulasCalendario: CelulaCalendario[] = []

  // Dias do mês anterior
  for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
    const diaNum = totalDiasMesAnterior - i
    const mesAnt = mesAtualCal === 0 ? 12 : mesAtualCal
    const anoAnt = mesAtualCal === 0 ? anoAtualCal - 1 : anoAtualCal
    const dataStr = `${anoAnt}-${String(mesAnt).padStart(2, '0')}-${String(diaNum).padStart(2, '0')}`
    celulasCalendario.push({
      dia: diaNum,
      dataStr,
      ehMesAtual: false,
      ehHoje: dataStr === hojeFormatado,
    })
  }

  // Dias do mês corrente
  for (let d = 1; d <= totalDiasMes; d++) {
    const dataStr = `${anoAtualCal}-${String(mesAtualCal + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    celulasCalendario.push({
      dia: d,
      dataStr,
      ehMesAtual: true,
      ehHoje: dataStr === hojeFormatado,
    })
  }

  // Dias do mês seguinte até múltiplo de 7
  const sobraDias = (7 - (celulasCalendario.length % 7)) % 7
  for (let i = 1; i <= sobraDias; i++) {
    const mesProx = mesAtualCal === 11 ? 1 : mesAtualCal + 2
    const anoProx = mesAtualCal === 11 ? anoAtualCal + 1 : anoAtualCal
    const dataStr = `${anoProx}-${String(mesProx).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    celulasCalendario.push({
      dia: i,
      dataStr,
      ehMesAtual: false,
      ehHoje: dataStr === hojeFormatado,
    })
  }

  const obterItensDoDia = (dataStr: string) => {
    const evs = eventos.filter((ev) => {
      const dIni = ev.data_evento.slice(0, 10)
      if (dIni === dataStr) return true
      if (ev.data_fim) {
        const dFim = ev.data_fim.slice(0, 10)
        return dataStr >= dIni && dataStr <= dFim
      }
      return false
    })

    const consultas = consultasSaude.filter((c) => {
      if (!c.data_agendada) return false
      return c.data_agendada.slice(0, 10) === dataStr
    })

    return { eventos: evs, consultas }
  }

  const clicarDia = (dataStr: string) => {
    setEventoEditando(null)
    setNomeEv('')
    setTipoEv('aniversario')
    setDataInicioEv(`${dataStr}T09:00`)
    setDataFimEv('')
    setLocalEv('')
    setDestinoEv('')
    setDescricaoEv('')
    setOrcamentoEv('1500')
    setModalEventoAberto(true)
  }

  // Próximos eventos para a visualização em lista
  const todosItensFuturos = [
    ...eventos.map((e) => ({ ...e, tipoItem: 'evento' as const })),
    ...consultasSaude.map((c) => ({
      ...c,
      tipoItem: 'saude' as const,
      nome: `${c.tipo === 'consulta' ? '🩺 Consulta' : '🧪 Exame'}: ${c.titulo}`,
      data_evento: c.data_agendada,
    })),
  ]
    .filter((it) => it.data_evento && it.data_evento.slice(0, 10) >= hojeFormatado)
    .sort((a, b) => new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime())

  return (
    <div>
      {/* Topo / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Calendário & Eventos da Família
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Compromissos, aniversários, viagens, consultas médicas e planejamento completo de celebrações.
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

          <button
            type="button"
            onClick={() => {
              setModalWhatsappAberto(true)
              carregarConfigWhatsapp()
            }}
            className="btn btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📲</span>
            <span>WhatsApp (Evolution)</span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: whatsStatus === 'open' ? '#10b981' : whatsStatus === 'connecting' ? '#f59e0b' : '#ef4444',
                display: 'inline-block',
              }}
              title={`Status da Instância: ${whatsStatus}`}
            />
          </button>

          <button type="button" onClick={abrirCriacaoEvento} className="btn btn-primary">
            🎉 + Novo Evento / Viagem
          </button>
        </div>
      </div>

      {/* NAVEGAÇÃO PRINCIPAL: CALENDÁRIO VS PLANEJAMENTO */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--borda)', paddingBottom: '10px' }}>
        <button
          type="button"
          onClick={() => setAbaPrincipal('calendario')}
          className={`btn ${abaPrincipal === 'calendario' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '9px 22px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          📅 Calendário da Família
        </button>
        <button
          type="button"
          onClick={() => setAbaPrincipal('planejamento')}
          className={`btn ${abaPrincipal === 'planejamento' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '9px 22px', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          📋 Planejamento de Eventos ({eventos.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: CALENDÁRIO GERAL DA FAMÍLIA                       */}
      {/* ======================================================== */}
      {abaPrincipal === 'calendario' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Barra de Controles do Calendário */}
          <div className="card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={mesAnterior}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                title="Mês anterior"
              >
                ◀
              </button>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, minWidth: '190px', textAlign: 'center', textTransform: 'capitalize' }}>
                {mesAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                type="button"
                onClick={proximoMes}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                title="Próximo mês"
              >
                ▶
              </button>
              <button
                type="button"
                onClick={irParaHoje}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Hoje
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setVisualizacaoCalendario('mes')}
                className={`btn ${visualizacaoCalendario === 'mes' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                📅 Grade Mensal
              </button>
              <button
                type="button"
                onClick={() => setVisualizacaoCalendario('lista')}
                className={`btn ${visualizacaoCalendario === 'lista' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.85rem' }}
              >
                📋 Próximos ({todosItensFuturos.length})
              </button>
            </div>
          </div>

          {/* Visualização: Grade Mensal */}
          {visualizacaoCalendario === 'mes' ? (
            <div className="card" style={{ padding: '16px', overflowX: 'auto' }}>
              <div style={{ minWidth: '700px' }}>
                {/* Dias da Semana */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
                  {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((ds) => (
                    <div
                      key={ds}
                      style={{
                        padding: '8px',
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: 'var(--texto-secundario)',
                        backgroundColor: 'var(--bg-hover)',
                        borderRadius: 'var(--raio-sm)',
                      }}
                    >
                      {ds}
                    </div>
                  ))}
                </div>

                {/* Grade dos Dias */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {celulasCalendario.map((c, idx) => {
                    const { eventos: evsDia, consultas: consDia } = obterItensDoDia(c.dataStr)
                    const totalItens = evsDia.length + consDia.length

                    return (
                      <div
                        key={idx}
                        onClick={() => clicarDia(c.dataStr)}
                        style={{
                          minHeight: '115px',
                          backgroundColor: c.ehMesAtual ? 'var(--bg-card)' : 'var(--bg-hover)',
                          borderRadius: 'var(--raio-sm)',
                          border: c.ehHoje ? '2px solid var(--cor-primaria)' : '1px solid var(--borda)',
                          padding: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          cursor: 'pointer',
                          opacity: c.ehMesAtual ? 1 : 0.45,
                          transition: 'background-color 0.15s ease',
                        }}
                        title={`Clique para adicionar um evento em ${new Date(c.dataStr + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {c.ehHoje ? (
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff', backgroundColor: 'var(--cor-primaria)', padding: '1px 5px', borderRadius: '4px' }}>
                              Hoje
                            </span>
                          ) : (
                            <span />
                          )}
                          <span style={{ fontSize: '0.8rem', fontWeight: c.ehHoje ? 800 : 600, color: c.ehHoje ? 'var(--cor-primaria)' : 'var(--texto-principal)' }}>
                            {c.dia}
                          </span>
                        </div>

                        {/* Badges de Eventos do Dia */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '2px', overflowY: 'auto', maxHeight: '85px' }}>
                          {evsDia.map((ev) => {
                            const tipoInfo = TIPOS_EVENTO[ev.tipo] || TIPOS_EVENTO.outro
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setItemSelecionadoCalendario({ tipo: 'evento', dados: ev })
                                }}
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'var(--cor-primaria-suave)',
                                  color: 'var(--cor-primaria)',
                                  border: '1px solid var(--cor-primaria)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                                title={`${tipoInfo.icone} ${ev.nome}`}
                              >
                                {tipoInfo.icone} {ev.nome}
                              </div>
                            )
                          })}

                          {consDia.map((con) => (
                            <div
                              key={con.id}
                              onClick={(e) => {
                                e.stopPropagation()
                                setItemSelecionadoCalendario({ tipo: 'saude', dados: con })
                              }}
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: con.tipo === 'consulta' ? '#eff6ff' : '#ecfdf5',
                                color: con.tipo === 'consulta' ? '#1d4ed8' : '#047857',
                                border: `1px solid ${con.tipo === 'consulta' ? '#93c5fd' : '#6ee7b7'}`,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                              title={`${con.tipo === 'consulta' ? '🩺 Consulta' : '🧪 Exame'}: ${con.titulo}`}
                            >
                              {con.tipo === 'consulta' ? '🩺' : '🧪'} {con.titulo}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Visualização: Lista de Próximos Eventos */
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>
                Próximos Compromissos & Celebrações da Família
              </h3>

              {todosItensFuturos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--texto-secundario)' }}>
                  Nenhum compromisso futuro agendado. Clique em "+ Novo Evento / Viagem" para agendar!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {todosItensFuturos.map((it: any) => {
                    const ehEv = it.tipoItem === 'evento'
                    const tipoInfo = ehEv ? (TIPOS_EVENTO[it.tipo] || TIPOS_EVENTO.outro) : null

                    return (
                      <div
                        key={it.id}
                        onClick={() => setItemSelecionadoCalendario({ tipo: it.tipoItem, dados: it })}
                        style={{
                          padding: '14px 18px',
                          borderRadius: 'var(--raio-md)',
                          backgroundColor: 'var(--bg-hover)',
                          borderLeft: `4px solid ${ehEv ? 'var(--cor-primaria)' : it.tipo === 'consulta' ? '#2563eb' : '#059669'}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          gap: '14px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1.5rem' }}>
                            {ehEv ? tipoInfo?.icone : it.tipo === 'consulta' ? '🩺' : '🧪'}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{it.nome}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                              📅 {new Date(it.data_evento).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                              {it.local && ` • 📍 ${it.local}`}
                              {it.especialista_ou_clinica && ` • 🏥 ${it.especialista_ou_clinica}`}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {ehEv ? (
                            <span className="badge badge-primary">
                              {tipoInfo?.label}
                            </span>
                          ) : (
                            <span className={`badge ${it.tipo === 'consulta' ? 'badge-primary' : 'badge-secondary'}`}>
                              {it.tipo === 'consulta' ? 'Consulta Médica' : 'Exame'}
                            </span>
                          )}
                          <span style={{ fontSize: '0.8rem', color: 'var(--cor-primaria)', fontWeight: 600 }}>
                            Ver Detalhes →
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: PLANEJAMENTO COMPLETO DE EVENTOS & VIAGENS        */}
      {/* ======================================================== */}
      {abaPrincipal === 'planejamento' && (
        <div>

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

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={enviarTodosConvitesWhatsapp}
                    disabled={enviandoTodosConvites || convidados.length === 0}
                    className="btn btn-primary"
                    style={{ backgroundColor: '#25D366', borderColor: '#25D366', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                  >
                    {enviandoTodosConvites ? 'Enviando...' : '📲 Enviar WhatsApp para Pendentes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoConvidado('contatos')
                      setModalConvidadoAberto(true)
                    }}
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    👥 + Importar dos Contatos ({contatosAgenda.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModoConvidado('manual')
                      setModalConvidadoAberto(true)
                    }}
                    className="btn btn-secondary"
                  >
                    ✏️ Digitar Manualmente
                  </button>
                </div>
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
                        <th>Convite WhatsApp</th>
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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {c.convite_enviado_em ? (
                                  <div style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span>
                                      📨 Enviado às {new Date(c.convite_enviado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {c.resposta_texto && (
                                      <span style={{ fontStyle: 'italic', color: 'var(--texto-secundario)' }}>
                                        💬 "{c.resposta_texto}"
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => enviarConviteWhatsapp(c.id)}
                                      disabled={enviandoConviteId === c.id || !c.telefone}
                                      className="btn btn-secondary"
                                      style={{ padding: '2px 6px', fontSize: '0.7rem', width: 'fit-content' }}
                                    >
                                      {enviandoConviteId === c.id ? 'Reenviando...' : '🔄 Reenviar'}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => enviarConviteWhatsapp(c.id)}
                                    disabled={enviandoConviteId === c.id || !c.telefone}
                                    className="btn btn-primary"
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.75rem',
                                      backgroundColor: '#25D366',
                                      borderColor: '#25D366',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {enviandoConviteId === c.id ? 'Enviando...' : '📲 Enviar Convite'}
                                  </button>
                                )}
                              </div>
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
    </div>
  )}

      {/* Modal Detalhes Rápidos ao Clicar no Calendário */}
      {itemSelecionadoCalendario && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10005, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '540px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--cor-primaria)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.75rem' }}>
                  {itemSelecionadoCalendario.tipo === 'evento'
                    ? (TIPOS_EVENTO[itemSelecionadoCalendario.dados.tipo]?.icone || '🎉')
                    : itemSelecionadoCalendario.dados.tipo === 'consulta' ? '🩺' : '🧪'}
                </span>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {itemSelecionadoCalendario.dados.nome || itemSelecionadoCalendario.dados.titulo}
                  </h3>
                  <span className={`badge ${itemSelecionadoCalendario.tipo === 'evento' ? 'badge-primary' : 'badge-secondary'}`}>
                    {itemSelecionadoCalendario.tipo === 'evento'
                      ? (TIPOS_EVENTO[itemSelecionadoCalendario.dados.tipo]?.label || 'Evento')
                      : itemSelecionadoCalendario.dados.tipo === 'consulta' ? 'Consulta Médica' : 'Exame Laboratorial'}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => setItemSelecionadoCalendario(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', marginBottom: '20px', backgroundColor: 'var(--bg-hover)', padding: '14px', borderRadius: 'var(--raio-md)' }}>
              <div>
                📅 <strong>Data:</strong>{' '}
                {new Date(itemSelecionadoCalendario.dados.data_evento || itemSelecionadoCalendario.dados.data_agendada).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
              </div>
              {itemSelecionadoCalendario.dados.data_fim && (
                <div>
                  🏁 <strong>Término:</strong>{' '}
                  {new Date(itemSelecionadoCalendario.dados.data_fim).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                </div>
              )}
              {itemSelecionadoCalendario.dados.local && (
                <div>📍 <strong>Local:</strong> {itemSelecionadoCalendario.dados.local}</div>
              )}
              {itemSelecionadoCalendario.dados.destino && (
                <div>🗺️ <strong>Destino:</strong> {itemSelecionadoCalendario.dados.destino}</div>
              )}
              {itemSelecionadoCalendario.dados.especialista_ou_clinica && (
                <div>🏥 <strong>Médico / Clínica:</strong> {itemSelecionadoCalendario.dados.especialista_ou_clinica}</div>
              )}
              {itemSelecionadoCalendario.dados.descricao && (
                <div>📝 <strong>Descrição:</strong> {itemSelecionadoCalendario.dados.descricao}</div>
              )}
              {itemSelecionadoCalendario.dados.resultado && (
                <div>🧪 <strong>Resultado:</strong> {itemSelecionadoCalendario.dados.resultado}</div>
              )}
              {itemSelecionadoCalendario.dados.observacoes && (
                <div>📋 <strong>Observações:</strong> {itemSelecionadoCalendario.dados.observacoes}</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              {itemSelecionadoCalendario.tipo === 'evento' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const evId = itemSelecionadoCalendario.dados.id
                      setItemSelecionadoCalendario(null)
                      setEventoAtivoId(evId)
                      setAbaPrincipal('planejamento')
                    }}
                    className="btn btn-primary"
                    style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    📋 Abrir Planejamento Completo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const ev = itemSelecionadoCalendario.dados
                      setItemSelecionadoCalendario(null)
                      abrirEdicaoEvento(ev)
                    }}
                    className="btn btn-secondary"
                  >
                    ✏️ Editar
                  </button>
                </>
              ) : (
                <a
                  href="/saude"
                  className="btn btn-primary"
                  style={{ textDecoration: 'none', fontWeight: 700 }}
                >
                  🩺 Abrir no Módulo de Saúde →
                </a>
              )}
              <button type="button" onClick={() => setItemSelecionadoCalendario(null)} className="btn btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
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

      {/* Modal Adicionar Convidado (Contatos da Agenda ou Manual) */}
      {modalConvidadoAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', backgroundColor: 'var(--bg-card)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>👥</span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Adicionar Convidados para {eventoAtual?.nome}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModalConvidadoAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            {/* Abas do Modal */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--borda)', paddingBottom: '8px' }}>
              <button
                type="button"
                onClick={() => setModoConvidado('contatos')}
                className={`btn ${modoConvidado === 'contatos' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                📋 Importar da Agenda ({contatosAgenda.length})
              </button>
              <button
                type="button"
                onClick={() => setModoConvidado('manual')}
                className={`btn ${modoConvidado === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                ✏️ Digitar Manualmente
              </button>
            </div>

            {/* MODO 1: SELECIONAR DA AGENDA DE CONTATOS */}
            {modoConvidado === 'contatos' ? (
              <div>
                {/* Campo de Busca */}
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="🔍 Buscar contato por nome, telefone ou categoria..."
                    value={buscaContatoConv}
                    onChange={(e) => setBuscaContatoConv(e.target.value)}
                  />
                </div>

                {(() => {
                  const contatosFiltrados = contatosAgenda.filter((c) => {
                    const t = buscaContatoConv.toLowerCase().trim()
                    if (!t) return true
                    return (
                      c.nome.toLowerCase().includes(t) ||
                      (c.telefone && c.telefone.includes(t)) ||
                      (c.especialidade && c.especialidade.toLowerCase().includes(t))
                    )
                  })

                  const nomesJaConvidados = new Set(convidados.map((c) => c.nome.toLowerCase().trim()))
                  const todosFiltradosMarcados =
                    contatosFiltrados.length > 0 &&
                    contatosFiltrados.every((c) => contatosSelecionados[c.id])
                  const totalSelecionados = Object.values(contatosSelecionados).filter(Boolean).length

                  return (
                    <>
                      {/* Barra de Selecionar Todos */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-hover)',
                          borderRadius: 'var(--raio-sm)',
                          marginBottom: '12px',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id="checkTodosContatos"
                            checked={todosFiltradosMarcados}
                            onChange={(e) => {
                              const marcar = e.target.checked
                              const novo = { ...contatosSelecionados }
                              contatosFiltrados.forEach((c) => {
                                novo[c.id] = marcar
                              })
                              setContatosSelecionados(novo)
                            }}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-primaria)' }}
                          />
                          <label htmlFor="checkTodosContatos" style={{ fontWeight: 600, cursor: 'pointer' }}>
                            Selecionar Todos Filtrados ({contatosFiltrados.length})
                          </label>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {totalSelecionados > 0 && (
                            <span style={{ fontWeight: 700, color: 'var(--cor-primaria)' }}>
                              {totalSelecionados} selecionados
                            </span>
                          )}
                          {totalSelecionados > 0 && (
                            <button
                              type="button"
                              onClick={() => setContatosSelecionados({})}
                              style={{ background: 'none', border: 'none', color: 'var(--texto-secundario)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lista de Contatos */}
                      {contatosFiltrados.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--texto-secundario)', fontSize: '0.85rem' }}>
                          Nenhum contato encontrado na agenda com esse termo.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                          {contatosFiltrados.map((c) => {
                            const jaAdicionado = nomesJaConvidados.has(c.nome.toLowerCase().trim())
                            const marcado = !!contatosSelecionados[c.id]

                            return (
                              <div
                                key={c.id}
                                onClick={() => {
                                  if (!jaAdicionado) {
                                    setContatosSelecionados({ ...contatosSelecionados, [c.id]: !marcado })
                                  }
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: 'var(--raio-sm)',
                                  backgroundColor: marcado ? 'var(--cor-primaria-suave)' : 'var(--bg-hover)',
                                  border: marcado ? '1px solid var(--cor-primaria)' : '1px solid var(--borda)',
                                  cursor: jaAdicionado ? 'default' : 'pointer',
                                  opacity: jaAdicionado ? 0.6 : 1,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <input
                                    type="checkbox"
                                    checked={marcado}
                                    disabled={jaAdicionado}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      setContatosSelecionados({ ...contatosSelecionados, [c.id]: e.target.checked })
                                    }}
                                    style={{ width: '18px', height: '18px', cursor: jaAdicionado ? 'not-allowed' : 'pointer', accentColor: 'var(--cor-primaria)' }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.nome}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', display: 'flex', gap: '8px' }}>
                                      {c.telefone && <span>📞 {c.telefone}</span>}
                                      {c.especialidade && <span>• {c.especialidade}</span>}
                                    </div>
                                  </div>
                                </div>

                                {jaAdicionado ? (
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--cor-sucesso)', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                                    ✓ Já na Lista
                                  </span>
                                ) : (
                                  marcado && (
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--cor-primaria)' }}>
                                      Selecionado
                                    </span>
                                  )
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Botão de Ação */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                        <button type="button" onClick={() => setModalConvidadoAberto(false)} className="btn btn-secondary">
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAdicionarContatosLote}
                          disabled={totalSelecionados === 0 || salvandoContatosLote}
                          className="btn btn-primary"
                          style={{ fontWeight: 700 }}
                        >
                          {salvandoContatosLote ? 'Adicionando...' : `Adicionar ${totalSelecionados} Contatos`}
                        </button>
                      </div>
                    </>
                  )
                })()}
              </div>
            ) : (
              /* MODO 2: DIGITAR MANUALMENTE */
              <form onSubmit={handleAdicionarConvidado} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nome Completo *</label>
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
            )}
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

      {/* Modal Configuração do WhatsApp (Evolution API) */}
      {modalWhatsappAberto && (
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
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: 'var(--bg-card)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>📲</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Configuração WhatsApp (Evolution API)</h2>
              </div>
              <button
                type="button"
                onClick={() => setModalWhatsappAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            {/* Status da Instância */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: 'var(--raio-md)',
                backgroundColor: whatsStatus === 'open' ? '#ecfdf5' : whatsStatus === 'connecting' ? '#fffbeb' : '#fef2f2',
                border: `1px solid ${whatsStatus === 'open' ? '#a7f3d0' : whatsStatus === 'connecting' ? '#fde68a' : '#fecaca'}`,
                marginBottom: '18px',
              }}
            >
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: whatsStatus === 'open' ? '#065f46' : whatsStatus === 'connecting' ? '#b45309' : '#991b1b' }}>
                  {whatsStatus === 'open'
                    ? '🟢 Conectado e Pronto'
                    : whatsStatus === 'connecting'
                    ? '🟡 Aguardando Leitura do QR Code'
                    : '🔴 Desconectado'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                  Instância: <strong>{whatsInstanceName}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={checarStatusWhatsapp}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                🔄 Checar Status
              </button>
            </div>

            {/* Formulário de Configuração */}
            <form onSubmit={salvarConfigWhatsapp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">URL do Servidor Evolution API *</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://evolution.seudominio.com"
                  value={whatsServerUrl}
                  onChange={(e) => setWhatsServerUrl(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">API Key Global (Token da Evolution API) *</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Sua chave de autenticação apikey"
                  value={whatsApiKey}
                  onChange={(e) => setWhatsApiKey(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Instância *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="familia-os"
                  value={whatsInstanceName}
                  onChange={(e) => setWhatsInstanceName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button type="submit" className="btn btn-primary" disabled={salvandoWhatsConfig}>
                  {salvandoWhatsConfig ? 'Salvando...' : '💾 Salvar Configurações'}
                </button>
              </div>
            </form>

            {/* Ações de Conexão e QR Code */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--borda)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Conectar Instância do WhatsApp</h3>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={criarInstanciaWhatsapp}
                  disabled={conectandoWhats || !whatsServerUrl || !whatsApiKey}
                  className="btn btn-secondary"
                  style={{ flex: 1, minWidth: '160px', padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  ⚡ 1. Criar Nova Instância
                </button>
                <button
                  type="button"
                  onClick={conectarWhatsappQrCode}
                  disabled={conectandoWhats || !whatsServerUrl || !whatsApiKey}
                  className="btn btn-primary"
                  style={{ flex: 1, minWidth: '160px', padding: '8px 12px', fontSize: '0.8rem', backgroundColor: '#25D366', borderColor: '#25D366', fontWeight: 600 }}
                >
                  {conectandoWhats ? 'Gerando QR...' : '📲 2. Gerar QR Code'}
                </button>
              </div>

              {/* Exibição do QR Code */}
              {whatsQrCode && (
                <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#fff', borderRadius: 'var(--raio-md)', border: '2px dashed #25D366', marginTop: '8px' }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: '10px' }}>
                    Escaneie este QR Code com o WhatsApp do seu celular:
                  </p>
                  <img
                    src={whatsQrCode.startsWith('data:') ? whatsQrCode : `data:image/png;base64,${whatsQrCode}`}
                    alt="QR Code WhatsApp"
                    style={{ maxWidth: '240px', width: '100%', height: 'auto', margin: '0 auto', display: 'block', borderRadius: '8px' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '8px' }}>
                    Abra o WhatsApp &gt; Aparelhos conectados &gt; Conectar aparelho
                  </p>
                </div>
              )}

              {/* Informações do Webhook */}
              <div style={{ backgroundColor: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--raio-sm)', fontSize: '0.8rem', marginTop: '8px' }}>
                <div style={{ fontWeight: 700, color: 'var(--texto-principal)', marginBottom: '4px' }}>
                  🔗 Webhook para Confirmação Automática de Presença:
                </div>
                <code style={{ fontSize: '0.75rem', wordBreak: 'break-all', display: 'block', backgroundColor: 'var(--bg-card)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--borda)' }}>
                  https://familia.martel.page/api/webhooks/whatsapp
                </code>
                <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '6px', lineHeight: '1.4' }}>
                  Ao responderem <strong>1</strong> (Confirmar) ou <strong>2</strong> (Recusar), o status do convidado é atualizado na hora e uma mensagem de confirmação é enviada automaticamente!
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button type="button" onClick={() => setModalWhatsappAberto(false)} className="btn btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
