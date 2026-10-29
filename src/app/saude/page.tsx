'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Usuario {
  id: string
  nome: string
  avatar_url?: string
}

interface FichaMedica {
  id: string
  usuario_id: string
  tipo_sanguineo?: string
  alergias?: string
  medicamentos_uso_continuo?: string
  numero_plano_saude?: string
  carteirinha_plano_url?: string
  numero_plano_odontologico?: string
  carteirinha_odonto_url?: string
  resumo_clinico_ia?: string
  orientacoes_medico_ia?: string
  atualizado_ia_em?: string
}

interface Medicamento {
  id: string
  usuario_id: string
  nome_remedio: string
  dosagem: string
  horario: string
  foi_tomado_hoje: boolean
}

interface Vacina {
  id: string
  usuario_id: string
  nome_vacina: string
  dose: string
  data_aplicacao: string
  data_proxima_dose?: string
  lote?: string
  local_aplicacao?: string
  observacoes?: string
}

interface ConsultaExame {
  id: string
  usuario_id: string
  tipo: 'consulta' | 'exame'
  titulo: string
  especialista_ou_clinica?: string
  data_agendada?: string
  data_retorno?: string
  observacoes?: string
  resultado?: string
  link_anexo?: string
  status: 'a_agendar' | 'agendado' | 'concluido' | 'cancelado'
  contato_id?: string
  evento_id?: string
  concluido: boolean
}

interface ContatoAgenda {
  id: string
  nome: string
  especialidade?: string
  telefone: string
  email?: string
}

interface MetricaVital {
  id: string
  usuario_id: string
  tipo_metrica: 'pressao' | 'glicemia' | 'peso' | 'altura' | 'temperatura'
  valor_principal: number
  valor_secundario?: number
  unidade: string
  observacao?: string
  data_medicao: string
}

interface CheckinHumor {
  id: string
  usuario_id: string
  nivel_humor: number
  motivo?: string
  notas_diario?: string
  criado_em: string
}

export default function SaudePage() {
  const [abaAtiva, setAbaAtiva] = useState<'geral' | 'medicamentos' | 'vacinas' | 'consultas' | 'metricas'>('geral')
  const [modalSosAberto, setModalSosAberto] = useState(false)

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [usuarioLogadoId, setUsuarioLogadoId] = useState<string>('')
  const [carregando, setCarregando] = useState(true)

  // Dados e Check-in de Humor Avançado
  const [humorSelecionado, setHumorSelecionado] = useState<number | null>(null)
  const [motivoHumor, setMotivoHumor] = useState('')
  const [salvandoHumor, setSalvandoHumor] = useState(false)
  const [historicoCheckins, setHistoricoCheckins] = useState<CheckinHumor[]>([])
  const [modalHistoricoHumorAberto, setModalHistoricoHumorAberto] = useState(false)

  const [fichas, setFichas] = useState<FichaMedica[]>([])
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [vacinas, setVacinas] = useState<Vacina[]>([])
  const [consultas, setConsultas] = useState<ConsultaExame[]>([])
  const [metricas, setMetricas] = useState<MetricaVital[]>([])

  // Paginação e Ações em Lote para Consultas e Exames
  const [paginaAtualConsultas, setPaginaAtualConsultas] = useState(1)
  const itensPorPaginaConsultas = 10
  const [selecionadosConsultas, setSelecionadosConsultas] = useState<{ [id: string]: boolean }>({})
  const [modalAlterarMembroLoteAberto, setModalAlterarMembroLoteAberto] = useState(false)
  const [novoMembroLoteId, setNovoMembroLoteId] = useState('')
  const [executandoAcaoLote, setExecutandoAcaoLote] = useState(false)

  // Paginação e Ações em Lote para Métricas Vitais
  const [paginaAtualMetricas, setPaginaAtualMetricas] = useState(1)
  const itensPorPaginaMetricas = 10
  const [selecionadosMetricas, setSelecionadosMetricas] = useState<{ [id: string]: boolean }>({})
  const [modalAlterarMembroMetricasLoteAberto, setModalAlterarMembroMetricasLoteAberto] = useState(false)
  const [novoMembroMetricasLoteId, setNovoMembroMetricasLoteId] = useState('')
  const [executandoAcaoLoteMetricas, setExecutandoAcaoLoteMetricas] = useState(false)

  // Formulário Ficha
  const [fichaUsuarioId, setFichaUsuarioId] = useState('')
  const [tipoSanguineo, setTipoSanguineo] = useState('O+')
  const [alergias, setAlergias] = useState('')
  const [medicamentosContinuos, setMedicamentosContinuos] = useState('')
  const [planoSaude, setPlanoSaude] = useState('')
  const [planoOdonto, setPlanoOdonto] = useState('')
  const [arquivoCarteirinhaOdonto, setArquivoCarteirinhaOdonto] = useState<File | null>(null)
  const [salvandoFicha, setSalvandoFicha] = useState(false)

  // Formulário Medicamento
  const [medUsuarioId, setMedUsuarioId] = useState('')
  const [medNome, setMedNome] = useState('')
  const [medDosagem, setMedDosagem] = useState('')
  const [medHorario, setMedHorario] = useState('08:00')
  const [salvandoMed, setSalvandoMed] = useState(false)

  // Formulário Vacina
  const [vacUsuarioId, setVacUsuarioId] = useState('')
  const [vacNome, setVacNome] = useState('')
  const [vacDose, setVacDose] = useState('1ª Dose')
  const [vacData, setVacData] = useState('')
  const [vacProxima, setVacProxima] = useState('')
  const [vacLote, setVacLote] = useState('')
  const [vacLocal, setVacLocal] = useState('')
  const [salvandoVacina, setSalvandoVacina] = useState(false)

  const [contatosAgenda, setContatosAgenda] = useState<ContatoAgenda[]>([])

  // Formulário Consulta/Exame
  const [conUsuarioId, setConUsuarioId] = useState('')
  const [conTipo, setConTipo] = useState<'consulta' | 'exame'>('consulta')
  const [conTitulo, setConTitulo] = useState('')
  const [conClinica, setConClinica] = useState('')
  const [conContatoId, setConContatoId] = useState('')
  const [conStatus, setConStatus] = useState<'a_agendar' | 'agendado'>('agendado')
  const [conData, setConData] = useState('')
  const [conRetorno, setConRetorno] = useState('')
  const [conObs, setConObs] = useState('')
  const [conResultado, setConResultado] = useState('')
  const [conSincronizarAgenda, setConSincronizarAgenda] = useState(true)
  const [salvandoConsulta, setSalvandoConsulta] = useState(false)

  // Formulário Métrica Vital
  const [metUsuarioId, setMetUsuarioId] = useState('')
  const [metTipo, setMetTipo] = useState<'pressao' | 'glicemia' | 'peso' | 'altura' | 'temperatura'>('pressao')
  const [metVal1, setMetVal1] = useState('')
  const [metVal2, setMetVal2] = useState('')
  const [metObs, setMetObs] = useState('')
  const [salvandoMetrica, setSalvandoMetrica] = useState(false)

  // Estados para Importação de Exames com IA
  const [arquivoIa, setArquivoIa] = useState<File | null>(null)
  const [processandoIa, setProcessandoIa] = useState(false)
  const [modalIaAberto, setModalIaAberto] = useState(false)
  const [laudoExtraido, setLaudoExtraido] = useState<any>(null)
  const [salvandoExamesIa, setSalvandoExamesIa] = useState(false)
  const [iaLinkAnexo, setIaLinkAnexo] = useState('')
  const [iaMembroId, setIaMembroId] = useState('')
  const [examesSelecionados, setExamesSelecionados] = useState<{ [index: number]: boolean }>({})
  const [conArquivo, setConArquivo] = useState<File | null>(null)

  // Estados para Edição de Consulta/Exame
  const [consultaEditando, setConsultaEditando] = useState<ConsultaExame | null>(null)
  const [editConUsuarioId, setEditConUsuarioId] = useState('')
  const [editConTipo, setEditConTipo] = useState<'consulta' | 'exame'>('consulta')
  const [editConTitulo, setEditConTitulo] = useState('')
  const [editConClinica, setEditConClinica] = useState('')
  const [editConContatoId, setEditConContatoId] = useState('')
  const [editConStatus, setEditConStatus] = useState<'a_agendar' | 'agendado' | 'concluido' | 'cancelado'>('agendado')
  const [editConData, setEditConData] = useState('')
  const [editConRetorno, setEditConRetorno] = useState('')
  const [editConObs, setEditConObs] = useState('')
  const [editConResultado, setEditConResultado] = useState('')
  const [editConLinkAnexo, setEditConLinkAnexo] = useState('')
  const [editConConcluido, setEditConConcluido] = useState(false)
  const [salvandoEdicaoConsulta, setSalvandoEdicaoConsulta] = useState(false)

  // Modais de Ação Rápida no Ciclo de Vida:
  const [consultaAgendando, setConsultaAgendando] = useState<ConsultaExame | null>(null)
  const [agendarData, setAgendarData] = useState('')
  const [agendarContatoId, setAgendarContatoId] = useState('')
  const [agendarClinica, setAgendarClinica] = useState('')
  const [agendarSincronizar, setAgendarSincronizar] = useState(true)
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false)

  const [consultaConfirmando, setConsultaConfirmando] = useState<ConsultaExame | null>(null)
  const [confirmarResultado, setConfirmarResultado] = useState('')
  const [confirmarObs, setConfirmarObs] = useState('')
  const [confirmarRetorno, setConfirmarRetorno] = useState('')
  const [confirmarArquivo, setConfirmarArquivo] = useState<File | null>(null)
  const [salvandoConfirmacao, setSalvandoConfirmacao] = useState(false)

  // Estados para Carteirinha do Convênio e Edição de Ficha Médica
  const [arquivoCarteirinha, setArquivoCarteirinha] = useState<File | null>(null)
  const [fichaEditando, setFichaEditando] = useState<FichaMedica | null>(null)
  const [editFichaUsuarioId, setEditFichaUsuarioId] = useState('')
  const [editTipoSanguineo, setEditTipoSanguineo] = useState('O+')
  const [editAlergias, setEditAlergias] = useState('')
  const [editMedicamentosContinuos, setEditMedicamentosContinuos] = useState('')
  const [editPlanoSaude, setEditPlanoSaude] = useState('')
  const [editCarteirinhaUrl, setEditCarteirinhaUrl] = useState('')
  const [editArquivoCarteirinha, setEditArquivoCarteirinha] = useState<File | null>(null)
  const [editPlanoOdonto, setEditPlanoOdonto] = useState('')
  const [editCarteirinhaOdontoUrl, setEditCarteirinhaOdontoUrl] = useState('')
  const [editArquivoCarteirinhaOdonto, setEditArquivoCarteirinhaOdonto] = useState<File | null>(null)
  const [salvandoEdicaoFicha, setSalvandoEdicaoFicha] = useState(false)
  const [avaliandoClinicaId, setAvaliandoClinicaId] = useState<string | null>(null)

  // Estado para Detalhes de Consulta / Exame ao Clicar
  const [consultaDetalhes, setConsultaDetalhes] = useState<ConsultaExame | null>(null)

  const emojisHumor = [
    { nivel: 1, label: 'Muito Mal', emoji: '😢' },
    { nivel: 2, label: 'Para Baixo', emoji: '😕' },
    { nivel: 3, label: 'Neutro', emoji: '😐' },
    { nivel: 4, label: 'Bem', emoji: '🙂' },
    { nivel: 5, label: 'Excelente', emoji: '😄' },
  ]

  const carregarDados = async () => {
    try {
      setCarregando(true)

      const { data: usuariosData } = await supabase.from('usuarios').select('id, nome, avatar_url').order('nome')
      if (usuariosData) {
        setUsuarios(usuariosData)
        if (usuariosData.length > 0) {
          const primeiroId = usuariosData[0].id
          setFichaUsuarioId(primeiroId)
          setMedUsuarioId(primeiroId)
          setVacUsuarioId(primeiroId)
          setConUsuarioId(primeiroId)
          setMetUsuarioId(primeiroId)
        }

        const { data: authData } = await supabase.auth.getUser()
        if (authData?.user) {
          const achou = usuariosData.find((u) => u.id === authData.user.id)
          if (achou) {
            setUsuarioLogadoId(achou.id)
            setFichaUsuarioId(achou.id)
            setMedUsuarioId(achou.id)
            setVacUsuarioId(achou.id)
            setConUsuarioId(achou.id)
            setMetUsuarioId(achou.id)
          }
        }
      }

      const [resFichas, resMeds, resVacinas, resConsultas, resMetricas, resContatos, resCheckins] = await Promise.all([
        supabase.from('saude_fichas_medicas').select('*'),
        supabase.from('saude_medicamentos').select('*').order('horario'),
        supabase.from('saude_vacinacao').select('*').order('data_aplicacao', { ascending: false }),
        supabase.from('saude_consultas_exames').select('*').order('data_agendada', { ascending: false }),
        supabase.from('saude_metricas_vitais').select('*').order('data_medicao', { ascending: false }),
        supabase.from('agenda_contatos').select('id, nome, especialidade, telefone, email').order('nome'),
        supabase.from('saude_checkins').select('*').order('criado_em', { ascending: false }).limit(40),
      ])

      if (resFichas.data) setFichas(resFichas.data)
      if (resMeds.data) setMedicamentos(resMeds.data)
      if (resVacinas.data) setVacinas(resVacinas.data)
      if (resConsultas.data) setConsultas(resConsultas.data)
      if (resMetricas.data) setMetricas(resMetricas.data)
      if (resContatos.data) setContatosAgenda(resContatos.data)
      if (resCheckins.data) {
        setHistoricoCheckins(resCheckins.data)
        const meuUltimo = usuarioLogadoId ? resCheckins.data.find((c: any) => c.usuario_id === usuarioLogadoId) : resCheckins.data[0]
        if (meuUltimo) {
          setHumorSelecionado(meuUltimo.nivel_humor)
          setMotivoHumor(meuUltimo.motivo || meuUltimo.notas_diario || '')
        }
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [usuarioLogadoId])

  // --- REGISTRAR HUMOR & HISTÓRICO ---
  const registrarHumor = async (nivel?: number) => {
    const alvoNivel = nivel !== undefined ? nivel : humorSelecionado
    if (!alvoNivel) return alert('Por favor, selecione um emoji para o seu humor.')

    const userFinalId = usuarioLogadoId || (usuarios.length > 0 ? usuarios[0].id : null)
    if (!userFinalId) return alert('Nenhum usuário identificado para salvar o check-in.')

    setHumorSelecionado(alvoNivel)
    setSalvandoHumor(true)
    try {
      const payload = {
        usuario_id: userFinalId,
        nivel_humor: alvoNivel,
        motivo: motivoHumor.trim() || null,
        notas_diario: motivoHumor.trim() || null,
      }
      const { error } = await supabase.from('saude_checkins').insert([payload])
      if (error) throw error
      await carregarDados()
      alert('☀️ Check-in de humor registrado com sucesso!')
    } catch (err: any) {
      alert('Erro ao registrar humor: ' + err.message)
    } finally {
      setSalvandoHumor(false)
    }
  }

  const excluirCheckinHumor = async (id: string) => {
    if (!confirm('Deseja excluir este registro de humor?')) return
    try {
      await supabase.from('saude_checkins').delete().eq('id', id)
      setHistoricoCheckins((prev) => prev.filter((c) => c.id !== id))
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  // --- AÇÕES EM LOTE PARA CONSULTAS E EXAMES ---
  const idsConsultasSelecionados = Object.keys(selecionadosConsultas).filter((id) => selecionadosConsultas[id])

  const executarAcaoLote = async (acao: 'excluir' | 'concluir' | 'agendar') => {
    if (idsConsultasSelecionados.length === 0 || executandoAcaoLote) return

    if (acao === 'excluir') {
      if (!confirm(`Tem certeza que deseja excluir ${idsConsultasSelecionados.length} exames/consultas selecionados?`)) {
        return
      }
      setExecutandoAcaoLote(true)
      try {
        const { error } = await supabase.from('saude_consultas_exames').delete().in('id', idsConsultasSelecionados)
        if (error) throw error
        setConsultas((prev) => prev.filter((c) => !idsConsultasSelecionados.includes(c.id)))
        setSelecionadosConsultas({})
        alert(`🗑️ ${idsConsultasSelecionados.length} registros excluídos com sucesso!`)
      } catch (err: any) {
        alert('Erro ao excluir em lote: ' + err.message)
      } finally {
        setExecutandoAcaoLote(false)
      }
    } else if (acao === 'concluir') {
      setExecutandoAcaoLote(true)
      try {
        const { error } = await supabase
          .from('saude_consultas_exames')
          .update({ status: 'concluido', concluido: true })
          .in('id', idsConsultasSelecionados)
        if (error) throw error
        await carregarDados()
        setSelecionadosConsultas({})
        alert(`✅ ${idsConsultasSelecionados.length} registros marcados como Concluído!`)
      } catch (err: any) {
        alert('Erro ao atualizar em lote: ' + err.message)
      } finally {
        setExecutandoAcaoLote(false)
      }
    } else if (acao === 'agendar') {
      setExecutandoAcaoLote(true)
      try {
        const { error } = await supabase
          .from('saude_consultas_exames')
          .update({ status: 'agendado', concluido: false })
          .in('id', idsConsultasSelecionados)
        if (error) throw error
        await carregarDados()
        setSelecionadosConsultas({})
        alert(`🗓️ ${idsConsultasSelecionados.length} registros marcados como Agendado!`)
      } catch (err: any) {
        alert('Erro ao atualizar em lote: ' + err.message)
      } finally {
        setExecutandoAcaoLote(false)
      }
    }
  }

  const executarAlterarMembroLote = async (novoMembroId: string) => {
    if (idsConsultasSelecionados.length === 0 || !novoMembroId || executandoAcaoLote) return
    setExecutandoAcaoLote(true)
    try {
      const { error } = await supabase
        .from('saude_consultas_exames')
        .update({ usuario_id: novoMembroId })
        .in('id', idsConsultasSelecionados)
      if (error) throw error
      await carregarDados()
      setSelecionadosConsultas({})
      setModalAlterarMembroLoteAberto(false)
      const nomeMembro = usuarios.find((u) => u.id === novoMembroId)?.nome || 'Membro'
      alert(`👤 ${idsConsultasSelecionados.length} registros transferidos para ${nomeMembro} com sucesso!`)
    } catch (err: any) {
      alert('Erro ao transferir membro em lote: ' + err.message)
    } finally {
      setExecutandoAcaoLote(false)
    }
  }

  // --- AÇÕES EM LOTE PARA MÉTRICAS VITAIS ---
  const idsMetricasSelecionados = Object.keys(selecionadosMetricas).filter((id) => selecionadosMetricas[id])

  const executarAcaoLoteMetricas = async (acao: 'excluir') => {
    if (idsMetricasSelecionados.length === 0 || executandoAcaoLoteMetricas) return

    if (acao === 'excluir') {
      if (!confirm(`Tem certeza que deseja excluir ${idsMetricasSelecionados.length} medições selecionadas?`)) {
        return
      }
      setExecutandoAcaoLoteMetricas(true)
      try {
        const { error } = await supabase.from('saude_metricas_vitais').delete().in('id', idsMetricasSelecionados)
        if (error) throw error
        setMetricas((prev) => prev.filter((m) => !idsMetricasSelecionados.includes(m.id)))
        setSelecionadosMetricas({})
        alert(`🗑️ ${idsMetricasSelecionados.length} medições excluídas com sucesso!`)
      } catch (err: any) {
        alert('Erro ao excluir medições em lote: ' + err.message)
      } finally {
        setExecutandoAcaoLoteMetricas(false)
      }
    }
  }

  const executarAlterarMembroMetricasLote = async (novoMembroId: string) => {
    if (idsMetricasSelecionados.length === 0 || !novoMembroId || executandoAcaoLoteMetricas) return
    setExecutandoAcaoLoteMetricas(true)
    try {
      const { error } = await supabase
        .from('saude_metricas_vitais')
        .update({ usuario_id: novoMembroId })
        .in('id', idsMetricasSelecionados)
      if (error) throw error
      await carregarDados()
      setSelecionadosMetricas({})
      setModalAlterarMembroMetricasLoteAberto(false)
      const nomeMembro = usuarios.find((u) => u.id === novoMembroId)?.nome || 'Membro'
      alert(`👤 ${idsMetricasSelecionados.length} medições transferidas para ${nomeMembro} com sucesso!`)
    } catch (err: any) {
      alert('Erro ao transferir membro em lote: ' + err.message)
    } finally {
      setExecutandoAcaoLoteMetricas(false)
    }
  }

  // --- CRUD FICHA MÉDICA ---
  const handleSalvarFicha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fichaUsuarioId || salvandoFicha) return
    setSalvandoFicha(true)
    try {
      let carteirinhaUrl = null
      if (arquivoCarteirinha) {
        const nomeArquivo = `carteirinhas/${Date.now()}_${arquivoCarteirinha.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: upErr } = await supabase.storage
          .from('familia-os-documentos')
          .upload(nomeArquivo, arquivoCarteirinha, { upsert: true })

        if (!upErr) {
          const { data: pUrl } = supabase.storage
            .from('familia-os-documentos')
            .getPublicUrl(nomeArquivo)
          carteirinhaUrl = pUrl.publicUrl
        }
      }

      let carteirinhaOdontoUrl = null
      if (arquivoCarteirinhaOdonto) {
        const nomeArquivoOdonto = `carteirinhas/${Date.now()}_odonto_${arquivoCarteirinhaOdonto.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: upErrOdonto } = await supabase.storage
          .from('familia-os-documentos')
          .upload(nomeArquivoOdonto, arquivoCarteirinhaOdonto, { upsert: true })

        if (!upErrOdonto) {
          const { data: pUrlOdonto } = supabase.storage
            .from('familia-os-documentos')
            .getPublicUrl(nomeArquivoOdonto)
          carteirinhaOdontoUrl = pUrlOdonto.publicUrl
        }
      }

      const payload = {
        usuario_id: fichaUsuarioId,
        tipo_sanguineo: tipoSanguineo,
        alergias: alergias || 'Nenhuma',
        medicamentos_uso_continuo: medicamentosContinuos || 'Nenhum',
        numero_plano_saude: planoSaude || 'Não informado',
        carteirinha_plano_url: carteirinhaUrl,
        numero_plano_odontologico: planoOdonto || null,
        carteirinha_odonto_url: carteirinhaOdontoUrl,
      }
      const { error } = await supabase.from('saude_fichas_medicas').insert([payload])
      if (error) throw error
      await carregarDados()
      setAlergias('')
      setMedicamentosContinuos('')
      setPlanoSaude('')
      setPlanoOdonto('')
      setArquivoCarteirinha(null)
      setArquivoCarteirinhaOdonto(null)
      alert('Ficha médica salva com sucesso!')
    } catch (err: any) {
      alert('Erro ao salvar ficha: ' + err.message)
    } finally {
      setSalvandoFicha(false)
    }
  }

  const abrirEdicaoFicha = (f: FichaMedica) => {
    setFichaEditando(f)
    setEditFichaUsuarioId(f.usuario_id)
    setEditTipoSanguineo(f.tipo_sanguineo || 'O+')
    setEditAlergias(f.alergias || '')
    setEditMedicamentosContinuos(f.medicamentos_uso_continuo || '')
    setEditPlanoSaude(f.numero_plano_saude || '')
    setEditCarteirinhaUrl(f.carteirinha_plano_url || '')
    setEditArquivoCarteirinha(null)
    setEditPlanoOdonto(f.numero_plano_odontologico || '')
    setEditCarteirinhaOdontoUrl(f.carteirinha_odonto_url || '')
    setEditArquivoCarteirinhaOdonto(null)
  }

  const handleSalvarEdicaoFicha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fichaEditando || salvandoEdicaoFicha) return
    setSalvandoEdicaoFicha(true)
    try {
      let carteirinhaFinal = editCarteirinhaUrl
      if (editArquivoCarteirinha) {
        const nomeArquivo = `carteirinhas/${Date.now()}_${editArquivoCarteirinha.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: upErr } = await supabase.storage
          .from('familia-os-documentos')
          .upload(nomeArquivo, editArquivoCarteirinha, { upsert: true })

        if (!upErr) {
          const { data: pUrl } = supabase.storage
            .from('familia-os-documentos')
            .getPublicUrl(nomeArquivo)
          carteirinhaFinal = pUrl.publicUrl
        }
      }

      let carteirinhaOdontoFinal = editCarteirinhaOdontoUrl
      if (editArquivoCarteirinhaOdonto) {
        const nomeArquivoOdonto = `carteirinhas/${Date.now()}_odonto_${editArquivoCarteirinhaOdonto.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: upErrOdonto } = await supabase.storage
          .from('familia-os-documentos')
          .upload(nomeArquivoOdonto, editArquivoCarteirinhaOdonto, { upsert: true })

        if (!upErrOdonto) {
          const { data: pUrlOdonto } = supabase.storage
            .from('familia-os-documentos')
            .getPublicUrl(nomeArquivoOdonto)
          carteirinhaOdontoFinal = pUrlOdonto.publicUrl
        }
      }

      const payload = {
        usuario_id: editFichaUsuarioId,
        tipo_sanguineo: editTipoSanguineo,
        alergias: editAlergias || 'Nenhuma',
        medicamentos_uso_continuo: editMedicamentosContinuos || 'Nenhum',
        numero_plano_saude: editPlanoSaude || 'Não informado',
        carteirinha_plano_url: carteirinhaFinal || null,
        numero_plano_odontologico: editPlanoOdonto || null,
        carteirinha_odonto_url: carteirinhaOdontoFinal || null,
      }

      const { error } = await supabase
        .from('saude_fichas_medicas')
        .update(payload)
        .eq('id', fichaEditando.id)

      if (error) throw error

      await carregarDados()
      setFichaEditando(null)
      alert('Ficha médica atualizada com sucesso!')
    } catch (err: any) {
      alert('Erro ao atualizar ficha: ' + err.message)
    } finally {
      setSalvandoEdicaoFicha(false)
    }
  }

  const excluirFicha = async (id: string) => {
    if (!confirm('Deseja excluir esta ficha médica?')) return
    try {
      await supabase.from('saude_fichas_medicas').delete().eq('id', id)
      setFichas((prev) => prev.filter((f) => f.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  // --- CRUD MEDICAMENTOS ---
  const handleSalvarMedicamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!medUsuarioId || !medNome || salvandoMed) return
    setSalvandoMed(true)
    try {
      const payload = {
        usuario_id: medUsuarioId,
        nome_remedio: medNome,
        dosagem: medDosagem,
        horario: medHorario,
        foi_tomado_hoje: false,
      }
      const { error } = await supabase.from('saude_medicamentos').insert([payload])
      if (error) throw error
      await carregarDados()
      setMedNome('')
      setMedDosagem('')
    } catch (err: any) {
      alert('Erro ao salvar medicamento: ' + err.message)
    } finally {
      setSalvandoMed(false)
    }
  }

  const alternarMedicamentoTomado = async (medId: string, atualTomado: boolean) => {
    try {
      setMedicamentos((prev) => prev.map((m) => (m.id === medId ? { ...m, foi_tomado_hoje: !atualTomado } : m)))
      await supabase.from('saude_medicamentos').update({ foi_tomado_hoje: !atualTomado }).eq('id', medId)
    } catch (err) {
      console.error(err)
      carregarDados()
    }
  }

  const excluirMedicamento = async (medId: string) => {
    if (!confirm('Deseja excluir este lembrete de medicamento?')) return
    try {
      await supabase.from('saude_medicamentos').delete().eq('id', medId)
      setMedicamentos((prev) => prev.filter((m) => m.id !== medId))
    } catch (err) {
      console.error(err)
    }
  }

  // --- CRUD VACINAS ---
  const handleSalvarVacina = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vacUsuarioId || !vacNome || !vacData || salvandoVacina) return
    setSalvandoVacina(true)
    try {
      const payload = {
        usuario_id: vacUsuarioId,
        nome_vacina: vacNome,
        dose: vacDose,
        data_aplicacao: vacData,
        data_proxima_dose: vacProxima || null,
        lote: vacLote || null,
        local_aplicacao: vacLocal || null,
      }
      const { error } = await supabase.from('saude_vacinacao').insert([payload])
      if (error) throw error
      await carregarDados()
      setVacNome('')
      setVacData('')
      setVacProxima('')
      setVacLote('')
      setVacLocal('')
    } catch (err: any) {
      alert('Erro ao registrar vacina: ' + err.message)
    } finally {
      setSalvandoVacina(false)
    }
  }

  const excluirVacina = async (id: string) => {
    if (!confirm('Deseja excluir o registro desta vacina?')) return
    try {
      await supabase.from('saude_vacinacao').delete().eq('id', id)
      setVacinas((prev) => prev.filter((v) => v.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  // Helper: Criar evento na agenda familiar e sincronizar com Google Calendar
  const criarEventoAgenda = async (titulo: string, dataHora: string, local: string | null, descricao: string) => {
    try {
      const dataInicio = new Date(dataHora)
      const dataFim = new Date(dataInicio.getTime() + 60 * 60 * 1000)
      const { data: novoEvento, error } = await supabase.from('eventos').insert([
        {
          nome: titulo,
          data_evento: dataInicio.toISOString(),
          data_fim: dataFim.toISOString(),
          tipo: 'outro',
          local: local || 'Consultório / Clínica',
          descricao: descricao,
        },
      ]).select('id').single()

      if (!error && novoEvento) {
        try {
          fetch('/api/google-calendar/sync', { method: 'POST' }).catch(() => {})
        } catch {}
        return novoEvento.id
      }
    } catch (e) {
      console.error('Erro ao sincronizar com agenda:', e)
    }
    return null
  }

  // --- CRUD CONSULTAS / EXAMES ---
  const handleSalvarConsulta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conUsuarioId || !conTitulo || salvandoConsulta) return

    if (conStatus === 'agendado' && !conData) {
      alert('Por favor, informe a Data e Hora para o status Agendado.')
      return
    }

    setSalvandoConsulta(true)
    try {
      const membro = usuarios.find((u) => u.id === conUsuarioId)
      const contato = contatosAgenda.find((c) => c.id === conContatoId)
      const nomeClinica = conClinica || (contato ? `${contato.nome}${contato.especialidade ? ` (${contato.especialidade})` : ''}` : null)

      let eventoId = null
      let dataIso = conData ? new Date(conData).toISOString() : null

      if (conStatus === 'agendado' && dataIso && conSincronizarAgenda) {
        eventoId = await criarEventoAgenda(
          `${conTipo === 'consulta' ? '🩺 Consulta' : '🧪 Exame'}: ${conTitulo} (${membro?.nome || 'Família'})`,
          dataIso,
          nomeClinica,
          `Agendamento de saúde: ${conTitulo}. ${conObs || ''}`
        )
      }

      const payload = {
        usuario_id: conUsuarioId,
        tipo: conTipo,
        titulo: conTitulo,
        especialista_ou_clinica: nomeClinica,
        contato_id: conContatoId || null,
        data_agendada: dataIso,
        data_retorno: conRetorno || null,
        observacoes: conObs || null,
        resultado: conTipo === 'exame' ? (conResultado || null) : null,
        status: conStatus,
        evento_id: eventoId,
        concluido: false,
      }
      const { error } = await supabase.from('saude_consultas_exames').insert([payload])
      if (error) throw error
      await carregarDados()
      setConTitulo('')
      setConClinica('')
      setConContatoId('')
      setConData('')
      setConRetorno('')
      setConObs('')
      setConResultado('')
      setConStatus('agendado')
      alert(conStatus === 'a_agendar' ? 'Salvo como "A Agendar"! Você poderá marcar a data quando quiser.' : 'Consulta/Exame agendado com sucesso e integrado ao calendário!')
    } catch (err: any) {
      alert('Erro ao agendar consulta/exame: ' + err.message)
    } finally {
      setSalvandoConsulta(false)
    }
  }

  const toggleConcluidoConsulta = async (c: ConsultaExame) => {
    const novoStatus = c.status === 'concluido' ? 'agendado' : 'concluido'
    const novoConcluido = novoStatus === 'concluido'
    try {
      setConsultas(consultas.map((item) => (item.id === c.id ? { ...item, status: novoStatus, concluido: novoConcluido } : item)))
      await supabase.from('saude_consultas_exames').update({ status: novoStatus, concluido: novoConcluido }).eq('id', c.id)
    } catch (err) {
      console.error(err)
      carregarDados()
    }
  }

  const abrirModalAgendar = (c: ConsultaExame) => {
    setConsultaAgendando(c)
    setAgendarData(c.data_agendada ? c.data_agendada.slice(0, 16) : '')
    setAgendarContatoId(c.contato_id || '')
    setAgendarClinica(c.especialista_ou_clinica || '')
    setAgendarSincronizar(true)
  }

  const handleAgendarRapido = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consultaAgendando || !agendarData || salvandoAgendamento) return
    setSalvandoAgendamento(true)
    try {
      const c = consultaAgendando
      const membro = usuarios.find((u) => u.id === c.usuario_id)
      const contato = contatosAgenda.find((x) => x.id === agendarContatoId)
      const clinicaFinal = agendarClinica || (contato ? `${contato.nome}${contato.especialidade ? ` (${contato.especialidade})` : ''}` : c.especialista_ou_clinica)

      const dataIso = new Date(agendarData).toISOString()
      let eventoId = c.evento_id

      if (agendarSincronizar) {
        eventoId = await criarEventoAgenda(
          `${c.tipo === 'consulta' ? '🩺 Consulta' : '🧪 Exame'}: ${c.titulo} (${membro?.nome || 'Família'})`,
          dataIso,
          clinicaFinal || null,
          `Consulta marcada para ${membro?.nome}. ${c.observacoes || ''}`
        )
      }

      await supabase
        .from('saude_consultas_exames')
        .update({
          status: 'agendado',
          data_agendada: dataIso,
          especialista_ou_clinica: clinicaFinal || null,
          contato_id: agendarContatoId || null,
          evento_id: eventoId,
        })
        .eq('id', c.id)

      await carregarDados()
      setConsultaAgendando(null)
      alert('🎉 Consulta agendada com sucesso e sincronizada com a Agenda Familiar!')
    } catch (err: any) {
      alert('Erro ao agendar: ' + err.message)
    } finally {
      setSalvandoAgendamento(false)
    }
  }

  const abrirModalConfirmar = (c: ConsultaExame) => {
    setConsultaConfirmando(c)
    setConfirmarResultado(c.resultado || '')
    setConfirmarObs(c.observacoes || '')
    setConfirmarRetorno(c.data_retorno ? c.data_retorno.slice(0, 10) : '')
    setConfirmarArquivo(null)
  }

  const handleConfirmarRealizacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consultaConfirmando || salvandoConfirmacao) return
    setSalvandoConfirmacao(true)
    try {
      const c = consultaConfirmando
      let linkAnexo = c.link_anexo

      if (confirmarArquivo) {
        const nomeLimpo = confirmarArquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const caminhoStorage = `exames/${Date.now()}_${nomeLimpo}`
        const { error: upErr } = await supabase.storage
          .from('familia-os-documentos')
          .upload(caminhoStorage, confirmarArquivo, { upsert: true })

        if (!upErr) {
          const { data: pUrl } = supabase.storage
            .from('familia-os-documentos')
            .getPublicUrl(caminhoStorage)
          linkAnexo = pUrl.publicUrl
        }
      }

      await supabase
        .from('saude_consultas_exames')
        .update({
          status: 'concluido',
          concluido: true,
          resultado: c.tipo === 'exame' ? (confirmarResultado || null) : null,
          observacoes: confirmarObs || null,
          data_retorno: confirmarRetorno || null,
          link_anexo: linkAnexo || null,
        })
        .eq('id', c.id)

      await carregarDados()
      setConsultaConfirmando(null)
      alert('✅ Realização confirmada com sucesso! O registro foi marcado como Concluído.')

      // Dispara reavaliação clínica com IA em segundo plano
      dispararAvaliacaoClinicaIA(c.usuario_id)
    } catch (err: any) {
      alert('Erro ao confirmar: ' + err.message)
    } finally {
      setSalvandoConfirmacao(false)
    }
  }

  const excluirConsulta = async (id: string) => {
    if (!confirm('Excluir este agendamento?')) return
    try {
      await supabase.from('saude_consultas_exames').delete().eq('id', id)
      setConsultas((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const abrirEdicaoConsulta = (c: ConsultaExame) => {
    setConsultaEditando(c)
    setEditConUsuarioId(c.usuario_id)
    setEditConTipo(c.tipo)
    setEditConTitulo(c.titulo)
    setEditConClinica(c.especialista_ou_clinica || '')
    setEditConContatoId(c.contato_id || '')
    setEditConStatus(c.status || (c.concluido ? 'concluido' : 'agendado'))

    try {
      if (c.data_agendada) {
        const d = new Date(c.data_agendada)
        const offset = d.getTimezoneOffset() * 60000
        const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16)
        setEditConData(localISOTime)
      } else {
        setEditConData('')
      }
    } catch {
      setEditConData(c.data_agendada ? c.data_agendada.slice(0, 16) : '')
    }

    setEditConRetorno(c.data_retorno ? c.data_retorno.slice(0, 10) : '')
    setEditConObs(c.observacoes || '')
    setEditConResultado(c.resultado || '')
    setEditConLinkAnexo(c.link_anexo || '')
    setEditConConcluido(c.status === 'concluido' || c.concluido)
  }

  const handleSalvarEdicaoConsulta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consultaEditando || !editConTitulo || salvandoEdicaoConsulta) return
    setSalvandoEdicaoConsulta(true)
    try {
      const contato = contatosAgenda.find((x) => x.id === editConContatoId)
      const clinicaFinal = editConClinica || (contato ? `${contato.nome}${contato.especialidade ? ` (${contato.especialidade})` : ''}` : null)

      const payload = {
        usuario_id: editConUsuarioId,
        tipo: editConTipo,
        titulo: editConTitulo,
        especialista_ou_clinica: clinicaFinal,
        contato_id: editConContatoId || null,
        data_agendada: editConData ? new Date(editConData).toISOString() : null,
        data_retorno: editConRetorno || null,
        observacoes: editConObs || null,
        resultado: editConTipo === 'exame' ? (editConResultado || null) : null,
        status: editConStatus,
        link_anexo: editConLinkAnexo || null,
        concluido: editConStatus === 'concluido' || editConConcluido,
      }

      const { error } = await supabase
        .from('saude_consultas_exames')
        .update(payload)
        .eq('id', consultaEditando.id)

      if (error) throw error

      await carregarDados()
      setConsultaEditando(null)
      alert('Alteração salva com sucesso!')
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err.message)
    } finally {
      setSalvandoEdicaoConsulta(false)
    }
  }

  // --- CRUD MÉTRICAS VITAIS ---
  const handleSalvarMetrica = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!metUsuarioId || !metVal1 || salvandoMetrica) return
    setSalvandoMetrica(true)
    try {
      let unidade = 'mmHg'
      if (metTipo === 'glicemia') unidade = 'mg/dL'
      else if (metTipo === 'peso') unidade = 'kg'
      else if (metTipo === 'altura') unidade = 'cm'
      else if (metTipo === 'temperatura') unidade = '°C'

      const payload = {
        usuario_id: metUsuarioId,
        tipo_metrica: metTipo,
        valor_principal: parseFloat(metVal1),
        valor_secundario: metVal2 ? parseFloat(metVal2) : null,
        unidade,
        observacao: metObs || null,
        data_medicao: new Date().toISOString(),
      }
      const { error } = await supabase.from('saude_metricas_vitais').insert([payload])
      if (error) throw error
      await carregarDados()
      setMetVal1('')
      setMetVal2('')
      setMetObs('')
    } catch (err: any) {
      alert('Erro ao registrar métrica: ' + err.message)
    } finally {
      setSalvandoMetrica(false)
    }
  }

  const excluirMetrica = async (id: string) => {
    if (!confirm('Excluir esta medição?')) return
    try {
      await supabase.from('saude_metricas_vitais').delete().eq('id', id)
      setMetricas((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  // --- AVALIAÇÃO CLÍNICA COM IA & GUIA PARA A CONSULTA MÉDICA ---
  const dispararAvaliacaoClinicaIA = async (membroId: string) => {
    const membro = usuarios.find((u) => u.id === membroId)
    if (!membro) return

    setAvaliandoClinicaId(membroId)
    try {
      const fichaMembro = fichas.find((f) => f.usuario_id === membroId)
      const examesMembro = consultas
        .filter((c) => c.usuario_id === membroId && c.tipo === 'exame')
        .slice(-10)
        .map((c) => ({ titulo: c.titulo, data: c.data_agendada, obs: c.observacoes }))

      const metricasMembro = metricas
        .filter((m) => m.usuario_id === membroId)
        .slice(-15)
        .map((m) => ({
          tipo: m.tipo_metrica,
          valor: `${m.valor_principal}${m.valor_secundario ? 'x' + m.valor_secundario : ''} ${m.unidade}`,
          data: m.data_medicao,
          obs: m.observacao,
        }))

      const remediosAtivos = medicamentos
        .filter((med) => med.usuario_id === membroId)
        .map((med) => `${med.nome_remedio} (${med.dosagem}) às ${med.horario}`)

      const body = {
        usuario_id: membroId,
        nome_usuario: membro.nome,
        tipo_sanguineo: fichaMembro?.tipo_sanguineo || null,
        alergias: fichaMembro?.alergias || null,
        medicamentos_continuos: fichaMembro?.medicamentos_uso_continuo || null,
        remedios_ativos: remediosAtivos,
        historico_exames: examesMembro,
        metricas_recentes: metricasMembro,
      }

      const res = await fetch('/api/health/clinical-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro na avaliação clínica com IA.')

      // Atualiza a ficha médica no Supabase com o parecer clínico e guia da consulta
      await supabase
        .from('saude_fichas_medicas')
        .update({
          resumo_clinico_ia: data.resumo_clinico,
          orientacoes_medico_ia: data.orientacoes_medico,
          atualizado_ia_em: new Date().toISOString(),
        })
        .eq('usuario_id', membroId)

      await carregarDados()
      alert(`🧠 Parecer Clínico da IA Atualizado com Sucesso para ${membro.nome}!\n\nAs conclusões e o guia de perguntas para a próxima consulta já estão disponíveis na ficha médica.`)
    } catch (err: any) {
      console.error('Erro na avaliação clínica com IA:', err)
      alert('Erro ao gerar parecer clínico com IA: ' + err.message)
    } finally {
      setAvaliandoClinicaId(null)
    }
  }

  // --- OCR / IA: EXTRAÇÃO AUTOMÁTICA DE EXAME MÉDICO ---
  const handleUploadExameIa = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setArquivoIa(file)
    setProcessandoIa(true)
    const formData = new FormData()
    formData.append('file', file)

    // 1. Armazenar o documento original no Supabase Storage
    let urlAnexo = ''
    try {
      const nomeLimpo = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const caminhoStorage = `exames/${Date.now()}_${nomeLimpo}`
      const { error: upErr } = await supabase.storage
        .from('familia-os-documentos')
        .upload(caminhoStorage, file, { upsert: true })

      if (!upErr) {
        const { data: pUrl } = supabase.storage
          .from('familia-os-documentos')
          .getPublicUrl(caminhoStorage)
        urlAnexo = pUrl.publicUrl
      }
    } catch (e) {
      console.error('Erro ao armazenar arquivo do exame:', e)
    }
    setIaLinkAnexo(urlAnexo)

    try {
      const res = await fetch('/api/ocr/medical-exam', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao analisar exame.')

      // Normaliza lista de múltiplos exames identificados no laudo
      let listaExamesNormalizada: any[] = []
      if (data.exames && Array.isArray(data.exames) && data.exames.length > 0) {
        listaExamesNormalizada = data.exames
      } else if (data.titulo_exame) {
        listaExamesNormalizada = [
          {
            titulo_exame: data.titulo_exame,
            data_exame: data.data_exame || data.data_geral,
            conclusao_ou_interpretacao: data.conclusao_ou_diagnostico || data.resumo_geral,
            resultados: (data.metricas || []).map((m: any) => ({
              nome_parametro: m.nome_parametro,
              resultado: String(m.valor_obtido),
              valor_numerico: m.valor_obtido,
              unidade: m.unidade,
              valor_referencia: m.valor_referencia,
              status_resultado: m.status_resultado,
            })),
          },
        ]
      } else {
        listaExamesNormalizada = [
          {
            titulo_exame: 'Exame Laboratorial',
            data_exame: data.data_geral || new Date().toISOString().split('T')[0],
            conclusao_ou_interpretacao: data.resumo_geral,
            resultados: [],
          },
        ]
      }

      setLaudoExtraido({
        ...data,
        exames: listaExamesNormalizada,
      })

      // Seleciona todos os exames inicialmente
      const sel: { [index: number]: boolean } = {}
      listaExamesNormalizada.forEach((_, idx) => {
        sel[idx] = true
      })
      setExamesSelecionados(sel)

      // Identifica o membro familiar pelo nome do paciente
      if (data.paciente_nome && usuarios.length > 0) {
        const achou = usuarios.find((u) =>
          data.paciente_nome.toLowerCase().includes(u.nome.toLowerCase()) ||
          u.nome.toLowerCase().includes(data.paciente_nome.toLowerCase())
        )
        setIaMembroId(achou ? achou.id : usuarios[0].id)
      } else if (usuarios.length > 0) {
        setIaMembroId(usuarios[0].id)
      }

      setModalIaAberto(true)
    } catch (err: any) {
      alert('Erro na extração com IA: ' + err.message)
    } finally {
      setProcessandoIa(false)
      e.target.value = ''
    }
  }

  const salvarExamesIaNoSistema = async () => {
    if (!iaMembroId || !laudoExtraido || salvandoExamesIa) return
    setSalvandoExamesIa(true)
    try {
      const examesParaSalvar = (laudoExtraido.exames || []).filter(
        (_: any, idx: number) => examesSelecionados[idx]
      )

      if (examesParaSalvar.length === 0) {
        alert('Selecione pelo menos um exame para registrar.')
        return
      }

      const hoje = new Date().toISOString().split('T')[0]
      const dataGeral = laudoExtraido.data_geral || hoje
      const labClinica =
        laudoExtraido.laboratorio_ou_clinica ||
        laudoExtraido.medico_solicitante ||
        null

      let totalMetricasInseridas = 0

      for (const ex of examesParaSalvar) {
        const resumoResultados = (ex.resultados || [])
          .map(
            (r: any) =>
              `${r.nome_parametro}: ${r.resultado}${
                r.unidade ? ' ' + r.unidade : ''
              }`
          )
          .join('\n• ')

        const obsPartes = [
          ex.conclusao_ou_interpretacao
            ? `Conclusão: ${ex.conclusao_ou_interpretacao}`
            : '',
          laudoExtraido.resumo_geral
            ? `Resumo Geral do Laudo: ${laudoExtraido.resumo_geral}`
            : '',
          resumoResultados ? `Resultados:\n• ${resumoResultados}` : '',
        ]
          .filter(Boolean)
          .join('\n\n')

        const dataAgendada = ex.data_exame || dataGeral
        const payloadExame = {
          usuario_id: iaMembroId,
          tipo: 'exame',
          titulo: ex.titulo_exame || 'Exame Laboratorial',
          especialista_ou_clinica: labClinica,
          data_agendada: new Date(dataAgendada).toISOString(),
          status: 'concluido',
          resultado: obsPartes || 'Resultados extraídos via Inteligência Artificial.',
          observacoes: ex.conclusao_ou_interpretacao || laudoExtraido.resumo_geral || null,
          link_anexo: iaLinkAnexo || null,
          concluido: true,
        }

        await supabase.from('saude_consultas_exames').insert([payloadExame])

        // Inserir métricas vitais mensuráveis numericamente
        const metricasDoExame = (ex.resultados || [])
          .filter(
            (r: any) =>
              r.valor_numerico !== null &&
              r.valor_numerico !== undefined &&
              !isNaN(Number(r.valor_numerico))
          )
          .map((r: any) => {
            let tipoNormalizado:
              | 'pressao'
              | 'glicemia'
              | 'peso'
              | 'altura'
              | 'temperatura' = 'glicemia'
            const lowerNome = (r.nome_parametro || '').toLowerCase()

            if (lowerNome.includes('press') || lowerNome.includes('pa '))
              tipoNormalizado = 'pressao'
            else if (lowerNome.includes('peso') || lowerNome.includes('massa'))
              tipoNormalizado = 'peso'
            else if (
              lowerNome.includes('altur') ||
              lowerNome.includes('estatura')
            )
              tipoNormalizado = 'altura'
            else if (
              lowerNome.includes('temp') ||
              lowerNome.includes('febre')
            )
              tipoNormalizado = 'temperatura'
            else tipoNormalizado = 'glicemia'

            return {
              usuario_id: iaMembroId,
              tipo_metrica: tipoNormalizado,
              valor_principal: parseFloat(r.valor_numerico),
              unidade: r.unidade || '',
              observacao: `${r.nome_parametro} (${ex.titulo_exame}) - Ref: ${
                r.valor_referencia || 'N/A'
              }`,
              data_medicao: new Date(dataAgendada).toISOString(),
            }
          })

        if (metricasDoExame.length > 0) {
          await supabase
            .from('saude_metricas_vitais')
            .insert(metricasDoExame)
          totalMetricasInseridas += metricasDoExame.length
        }
      }

      await carregarDados()
      setModalIaAberto(false)
      setLaudoExtraido(null)
      alert(
        `🎉 Sucesso! ${examesParaSalvar.length} exames e ${totalMetricasInseridas} medições laboratoriais foram registrados no prontuário da família!\n\nA IA está consolidando agora a avaliação clínica para a sua próxima consulta.`
      )

      // Dispara automaticamente a avaliação clínica preventiva com IA para este membro
      const membroAlvo = iaMembroId
      setTimeout(() => {
        dispararAvaliacaoClinicaIA(membroAlvo)
      }, 600)
    } catch (err: any) {
      alert('Erro ao salvar exames: ' + err.message)
    } finally {
      setSalvandoExamesIa(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box' }}>
      {/* Topo / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Saúde Integral & Bem-Estar Familiar
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Check-in diário, medicamentos, vacinas, exames com IA, métricas e atendimento SOS.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="file"
            id="upload-exame-ia"
            accept="image/*,application/pdf"
            style={{ display: 'none' }}
            onChange={handleUploadExameIa}
            disabled={processandoIa}
          />
          <label
            htmlFor="upload-exame-ia"
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}
          >
            {processandoIa ? '🤖 Analisando com IA...' : '🔬 + Importar Exame (IA)'}
          </label>

          <button
            type="button"
            onClick={() => setModalSosAberto(true)}
            className="btn btn-danger"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
          >
            🚨 MODO SOS (Emergência)
          </button>
        </div>
      </div>

      {/* Check-in Diário de Humor & Bem-Estar Familiar (UX/UI Moderno) */}
      <div className="card" style={{ marginBottom: '24px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--borda)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>☀️</span> Check-in Diário de Humor & Bem-Estar
            </h2>
            <p style={{ color: 'var(--texto-secundario)', fontSize: '0.85rem', marginTop: '2px' }}>
              Como você e sua família estão se sentindo hoje? Compartilhe seu sentimento e o motivo.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalHistoricoHumorAberto(true)}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            📊 Histórico de Humor ({historicoCheckins.length})
          </button>
        </div>

        {/* Emojis Interativos */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {emojisHumor.map((item) => {
            const selecionado = humorSelecionado === item.nivel
            return (
              <button
                key={item.nivel}
                type="button"
                onClick={() => setHumorSelecionado(item.nivel)}
                style={{
                  flex: '1 1 90px',
                  minWidth: '85px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 10px',
                  borderRadius: 'var(--raio-lg)',
                  border: selecionado ? '2px solid var(--cor-primaria)' : '1px solid var(--borda)',
                  backgroundColor: selecionado ? 'var(--cor-primaria-suave)' : 'var(--bg-hover)',
                  cursor: 'pointer',
                  transform: selecionado ? 'scale(1.04)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  boxShadow: selecionado ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <span style={{ fontSize: '2rem' }}>{item.emoji}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: selecionado ? 700 : 500, color: selecionado ? 'var(--cor-primaria)' : 'var(--texto-principal)' }}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Campo de Motivação & Salvar */}
        <div style={{ paddingTop: '12px', borderTop: '1px solid var(--borda)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--texto-principal)' }}>
            💭 O que motivou o seu sentimento hoje? (Opcional)
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="input"
              placeholder="Ex: Dormi muito bem, passeio com a família, estresse no trabalho, dor de cabeça..."
              value={motivoHumor}
              onChange={(e) => setMotivoHumor(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  registrarHumor()
                }
              }}
              style={{ flex: 1, minWidth: '220px' }}
            />
            <button
              type="button"
              onClick={() => registrarHumor()}
              disabled={salvandoHumor}
              className="btn btn-primary"
              style={{ padding: '8px 20px', fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              {salvandoHumor ? 'Salvando...' : '💾 Salvar Check-in'}
            </button>
          </div>
        </div>
      </div>

      {/* Abas de Navegação do Módulo de Saúde */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--borda)', paddingBottom: '8px', overflowX: 'auto' }}>
        <button
          type="button"
          onClick={() => setAbaAtiva('geral')}
          className={`btn ${abaAtiva === 'geral' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
        >
          🩺 Fichas Médicas ({fichas.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('medicamentos')}
          className={`btn ${abaAtiva === 'medicamentos' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
        >
          💊 Medicamentos ({medicamentos.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('vacinas')}
          className={`btn ${abaAtiva === 'vacinas' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
        >
          💉 Vacinação ({vacinas.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('consultas')}
          className={`btn ${abaAtiva === 'consultas' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
        >
          📋 Consultas & Exames ({consultas.length})
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('metricas')}
          className={`btn ${abaAtiva === 'metricas' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 16px', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
        >
          📊 Métricas Vitais ({metricas.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: FICHAS MÉDICAS                                    */}
      {/* ======================================================== */}
      {abaAtiva === 'geral' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Cadastrar Ficha Médica de Emergência</h2>
            <form onSubmit={handleSalvarFicha} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Membro</label>
                <select className="input" value={fichaUsuarioId} onChange={(e) => setFichaUsuarioId(e.target.value)}>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo Sanguíneo</label>
                <select className="input" value={tipoSanguineo} onChange={(e) => setTipoSanguineo(e.target.value)}>
                  <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Alergias Conhecidas</label>
                <input type="text" className="input" placeholder="Ex: Penicilina, Amendoim" value={alergias} onChange={(e) => setAlergias(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Remédios de Uso Contínuo</label>
                <input type="text" className="input" placeholder="Ex: Insulina, Pressão" value={medicamentosContinuos} onChange={(e) => setMedicamentosContinuos(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Plano de Saúde</label>
                <input type="text" className="input" placeholder="Ex: Unimed 123456" value={planoSaude} onChange={(e) => setPlanoSaude(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Carteirinha Saúde (Foto/PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="input"
                  style={{ padding: '7px 12px' }}
                  onChange={(e) => setArquivoCarteirinha(e.target.files?.[0] || null)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Plano Odontológico</label>
                <input type="text" className="input" placeholder="Ex: Amil Dental 123456" value={planoOdonto} onChange={(e) => setPlanoOdonto(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Carteirinha Odonto (Foto/PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="input"
                  style={{ padding: '7px 12px' }}
                  onChange={(e) => setArquivoCarteirinhaOdonto(e.target.files?.[0] || null)}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvandoFicha}>
                {salvandoFicha ? 'Salvando...' : '+ Salvar Ficha'}
              </button>
            </form>
          </div>

          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px' }}>Fichas Registradas</h3>
            {fichas.length === 0 && !carregando ? (
              <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
                Nenhuma ficha cadastrada ainda.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                {fichas.map((f) => {
                  const u = usuarios.find((x) => x.id === f.usuario_id)
                  return (
                    <div key={f.id} className="card" style={{ borderLeft: '4px solid var(--cor-perigo)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{u?.nome || 'Membro'}</span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="badge badge-danger">Tipo: {f.tipo_sanguineo}</span>
                          {f.carteirinha_plano_url && (
                            <a
                              href={f.carteirinha_plano_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Visualizar carteirinha do plano de saúde"
                            >
                              💳 Saúde
                            </a>
                          )}
                          {f.carteirinha_odonto_url && (
                            <a
                              href={f.carteirinha_odonto_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '3px 8px', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="Visualizar carteirinha do plano odontológico"
                            >
                              🦷 Odonto
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => abrirEdicaoFicha(f)}
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            title="Alterar ficha médica"
                          >
                            ✏️
                          </button>
                          <button type="button" onClick={() => excluirFicha(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                        <div><strong>Alergias:</strong> {f.alergias}</div>
                        <div><strong>Medicamento Contínuo:</strong> {f.medicamentos_uso_continuo}</div>
                        <div><strong>Plano de Saúde:</strong> {f.numero_plano_saude}</div>
                        {f.numero_plano_odontologico && (
                          <div>🦷 <strong>Plano Odontológico:</strong> {f.numero_plano_odontologico}</div>
                        )}
                      </div>

                      {/* PARECER CLÍNICO DA IA & GUIA PARA A CONSULTA MÉDICA */}
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--borda)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cor-primaria)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🧠 Parecer Clínico da IA & Guia da Consulta
                          </span>
                          <button
                            type="button"
                            onClick={() => dispararAvaliacaoClinicaIA(f.usuario_id)}
                            disabled={avaliandoClinicaId === f.usuario_id}
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                            title="Reavaliar histórico de exames, medicamentos e métricas com o Gemini"
                          >
                            {avaliandoClinicaId === f.usuario_id ? 'Analisando...' : '🔄 Reavaliar com IA'}
                          </button>
                        </div>

                        {f.resumo_clinico_ia || f.orientacoes_medico_ia ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.825rem' }}>
                            {f.resumo_clinico_ia && (
                              <div style={{ backgroundColor: 'var(--bg-hover)', padding: '10px', borderRadius: 'var(--raio-sm)' }}>
                                <span style={{ fontWeight: 700, color: 'var(--texto-principal)' }}>🩺 Resumo Clínico & Hipóteses:</span>
                                <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px', lineHeight: '1.5' }}>{f.resumo_clinico_ia}</div>
                              </div>
                            )}
                            {f.orientacoes_medico_ia && (
                              <div style={{ backgroundColor: 'var(--cor-primaria-suave)', padding: '10px', borderRadius: 'var(--raio-sm)', border: '1px solid var(--cor-primaria)' }}>
                                <span style={{ fontWeight: 700, color: 'var(--cor-primaria)' }}>💬 O que conversar com o Médico na Consulta (Seu Norte):</span>
                                <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px', lineHeight: '1.5' }}>{f.orientacoes_medico_ia}</div>
                              </div>
                            )}
                            {f.atualizado_ia_em && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--texto-secundario)', textAlign: 'right' }}>
                                Avaliado em: {new Date(f.atualizado_ia_em).toLocaleString('pt-BR')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)' }}>
                            Nenhum parecer clínico gerado ainda.{' '}
                            <button
                              type="button"
                              onClick={() => dispararAvaliacaoClinicaIA(f.usuario_id)}
                              style={{ background: 'none', border: 'none', color: 'var(--cor-primaria)', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                            >
                              Clique aqui para gerar a avaliação clínica com IA
                            </button>.
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: MEDICAMENTOS                                      */}
      {/* ======================================================== */}
      {abaAtiva === 'medicamentos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>💊 Adicionar Novo Lembrete de Remédio</h2>
            <form onSubmit={handleSalvarMedicamento} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                <label className="form-label">Membro</label>
                <select className="input" value={medUsuarioId} onChange={(e) => setMedUsuarioId(e.target.value)}>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                <label className="form-label">Nome do Remédio</label>
                <input type="text" className="input" placeholder="Ex: Dipirona, Ritalina" value={medNome} onChange={(e) => setMedNome(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '110px' }}>
                <label className="form-label">Dosagem</label>
                <input type="text" className="input" placeholder="Ex: 500mg, 1 gota" value={medDosagem} onChange={(e) => setMedDosagem(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '110px' }}>
                <label className="form-label">Horário</label>
                <input type="time" className="input" value={medHorario} onChange={(e) => setMedHorario(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvandoMed}>
                {salvandoMed ? 'Salvando...' : '+ Adicionar Remédio'}
              </button>
            </form>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {medicamentos.map((med) => {
              const u = usuarios.find((x) => x.id === med.usuario_id)
              return (
                <div
                  key={med.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: 'var(--raio-md)',
                    backgroundColor: med.foi_tomado_hoje ? 'var(--cor-sucesso-suave)' : 'var(--bg-card)',
                    border: `1px solid ${med.foi_tomado_hoje ? 'var(--cor-sucesso)' : 'var(--borda)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={med.foi_tomado_hoje}
                      onChange={() => alternarMedicamentoTomado(med.id, med.foi_tomado_hoje)}
                      style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: 'var(--cor-sucesso)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, textDecoration: med.foi_tomado_hoje ? 'line-through' : 'none' }}>
                        {med.nome_remedio} ({med.dosagem})
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)' }}>
                        {u?.nome || 'Membro'} • ⏰ {med.horario}
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={() => excluirMedicamento(med.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: CARTEIRA DE VACINAÇÃO DIGITAL                     */}
      {/* ======================================================== */}
      {abaAtiva === 'vacinas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>💉 Registrar Nova Vacina</h2>
            <form onSubmit={handleSalvarVacina} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Membro</label>
                <select className="input" value={vacUsuarioId} onChange={(e) => setVacUsuarioId(e.target.value)}>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Vacina</label>
                <input type="text" className="input" placeholder="Ex: Gripe (Influenza), Tríplice" value={vacNome} onChange={(e) => setVacNome(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Dose</label>
                <select className="input" value={vacDose} onChange={(e) => setVacDose(e.target.value)}>
                  <option value="1ª Dose">1ª Dose</option>
                  <option value="2ª Dose">2ª Dose</option>
                  <option value="3ª Dose">3ª Dose</option>
                  <option value="Reforço">Reforço</option>
                  <option value="Dose Única">Dose Única</option>
                  <option value="Anual">Anual</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data de Aplicação</label>
                <input type="date" className="input" value={vacData} onChange={(e) => setVacData(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Próxima Dose / Reforço</label>
                <input type="date" className="input" value={vacProxima} onChange={(e) => setVacProxima(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Lote (Opcional)</label>
                <input type="text" className="input" placeholder="Lote / Fabricante" value={vacLote} onChange={(e) => setVacLote(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvandoVacina}>
                {salvandoVacina ? 'Salvando...' : '+ Salvar Vacina'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px' }}>Histórico de Imunizações</h3>
            {vacinas.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '24px' }}>
                Nenhuma vacina registrada na carteira da família.
              </div>
            ) : (
              <div className="tabela-container">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Membro</th>
                      <th>Vacina</th>
                      <th>Dose</th>
                      <th>Data Aplicação</th>
                      <th>Próxima Dose</th>
                      <th>Lote</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vacinas.map((v) => {
                      const u = usuarios.find((x) => x.id === v.usuario_id)
                      const proxVencida = v.data_proxima_dose && new Date(v.data_proxima_dose) < new Date()

                      return (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 600 }}>{u?.nome || 'Membro'}</td>
                          <td><strong>{v.nome_vacina}</strong></td>
                          <td><span className="badge badge-primary">{v.dose}</span></td>
                          <td>{new Date(v.data_aplicacao).toLocaleDateString('pt-BR')}</td>
                          <td>
                            {v.data_proxima_dose ? (
                              <span style={{ color: proxVencida ? 'var(--cor-perigo)' : 'var(--cor-sucesso)', fontWeight: 600 }}>
                                {new Date(v.data_proxima_dose).toLocaleDateString('pt-BR')} {proxVencida && '⚠️ Pendente'}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--texto-secundario)', fontSize: '0.8rem' }}>Concluído</span>
                            )}
                          </td>
                          <td>{v.lote || '-'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" onClick={() => excluirVacina(v.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: CONSULTAS & EXAMES                                */}
      {/* ======================================================== */}
      {abaAtiva === 'consultas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>📋 Registrar Consulta ou Exame</h2>
            <form onSubmit={handleSalvarConsulta} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Membro</label>
                <select className="input" value={conUsuarioId} onChange={(e) => setConUsuarioId(e.target.value)}>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo</label>
                <select className="input" value={conTipo} onChange={(e) => setConTipo(e.target.value as any)}>
                  <option value="consulta">🩺 Consulta Médica</option>
                  <option value="exame">🧪 Exame / Laboratório</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status do Agendamento</label>
                <select className="input" value={conStatus} onChange={(e) => setConStatus(e.target.value as any)}>
                  <option value="agendado">🗓️ Agendado (Com data/hora marcadas)</option>
                  <option value="a_agendar">📅 A Agendar (Pendente de marcação)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Título / Especialidade</label>
                <input type="text" className="input" placeholder="Ex: Pediatra, Oftalmologista, Hemograma" value={conTitulo} onChange={(e) => setConTitulo(e.target.value)} required />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Médico / Contato da Agenda</label>
                <select
                  className="input"
                  value={conContatoId}
                  onChange={(e) => {
                    const cid = e.target.value
                    setConContatoId(cid)
                    const sel = contatosAgenda.find((x) => x.id === cid)
                    if (sel) {
                      setConClinica(`${sel.nome}${sel.especialidade ? ` (${sel.especialidade})` : ''}`)
                    }
                  }}
                >
                  <option value="">-- Selecionar da Agenda de Contatos --</option>
                  {contatosAgenda.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.especialidade ? `• ${c.especialidade}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Clínica / Consultório</label>
                <input type="text" className="input" placeholder="Ex: Clínica São Marcos, Lab Sabin" value={conClinica} onChange={(e) => setConClinica(e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {conStatus === 'agendado' ? 'Data e Hora Agendada *' : 'Data Prevista (Opcional)'}
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  value={conData}
                  onChange={(e) => setConData(e.target.value)}
                  required={conStatus === 'agendado'}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data de Retorno (Opcional)</label>
                <input type="date" className="input" value={conRetorno} onChange={(e) => setConRetorno(e.target.value)} />
              </div>

              {conTipo === 'exame' ? (
                <>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">Resultado do Exame (Parâmetros / Laudo)</label>
                    <textarea
                      className="input"
                      rows={2}
                      placeholder="Ex: Glicemia: 92 mg/dL; Colesterol Total: 175 mg/dL; Laudo: Sem alterações"
                      value={conResultado}
                      onChange={(e) => setConResultado(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">Observações / Instruções de Preparo</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: Jejum de 12 horas, coletar primeira urina da manhã"
                      value={conObs}
                      onChange={(e) => setConObs(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                  <label className="form-label">Observações Médicas / Conduta da Consulta</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Ex: Dr. solicitou exames de sangue e recomendou reduzir sódio. Retorno previsto em 30 dias."
                    value={conObs}
                    onChange={(e) => setConObs(e.target.value)}
                  />
                </div>
              )}

              {conStatus === 'agendado' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', gridColumn: '1 / -1' }}>
                  <input
                    type="checkbox"
                    id="sincronizarAgenda"
                    checked={conSincronizarAgenda}
                    onChange={(e) => setConSincronizarAgenda(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-primaria)' }}
                  />
                  <label htmlFor="sincronizarAgenda" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                    📅 Sincronizar automaticamente com a Agenda Familiar e Google Calendar
                  </label>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ height: '42px', gridColumn: '1 / -1' }} disabled={salvandoConsulta}>
                {salvandoConsulta ? 'Salvando...' : conStatus === 'a_agendar' ? '+ Salvar como "A Agendar"' : '+ Salvar e Agendar'}
              </button>
            </form>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Agenda de Consultas e Exames</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)' }}>
                Total: <strong>{consultas.length}</strong> registros
              </div>
            </div>

            {/* Barra de Ações em Lote */}
            {idsConsultasSelecionados.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--cor-primaria-suave)',
                  border: '1px solid var(--cor-primaria)',
                  borderRadius: 'var(--raio-md)',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--cor-primaria)' }}>
                  <span>📦</span>
                  <span>
                    {idsConsultasSelecionados.length}{' '}
                    {idsConsultasSelecionados.length === 1 ? 'item selecionado' : 'itens selecionados'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNovoMembroLoteId(usuarios.length > 0 ? usuarios[0].id : '')
                      setModalAlterarMembroLoteAberto(true)
                    }}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    👤 Alterar Membro ({idsConsultasSelecionados.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => executarAcaoLote('concluir')}
                    disabled={executandoAcaoLote}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--cor-sucesso)', fontWeight: 600 }}
                  >
                    ✅ Marcar Concluído
                  </button>

                  <button
                    type="button"
                    onClick={() => executarAcaoLote('agendar')}
                    disabled={executandoAcaoLote}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}
                  >
                    🗓️ Marcar Agendado
                  </button>

                  <button
                    type="button"
                    onClick={() => executarAcaoLote('excluir')}
                    disabled={executandoAcaoLote}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--cor-perigo)', fontWeight: 600 }}
                  >
                    🗑️ Excluir Selecionados
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelecionadosConsultas({})}
                    style={{ background: 'none', border: 'none', color: 'var(--texto-secundario)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>
            )}

            {consultas.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '24px' }}>
                Nenhum agendamento pendente.
              </div>
            ) : (
              (() => {
                const totalPaginasConsultas = Math.ceil(consultas.length / itensPorPaginaConsultas) || 1
                const consultasPaginadas = consultas.slice(
                  (paginaAtualConsultas - 1) * itensPorPaginaConsultas,
                  paginaAtualConsultas * itensPorPaginaConsultas
                )

                const todosPaginaMarcados =
                  consultasPaginadas.length > 0 &&
                  consultasPaginadas.every((c) => selecionadosConsultas[c.id])

                return (
                  <div className="tabela-container" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
                    <table className="tabela">
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={todosPaginaMarcados}
                              onChange={(e) => {
                                const marcar = e.target.checked
                                const novo = { ...selecionadosConsultas }
                                consultasPaginadas.forEach((c) => {
                                  novo[c.id] = marcar
                                })
                                setSelecionadosConsultas(novo)
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-primaria)' }}
                              title="Selecionar todos desta página"
                            />
                          </th>
                          <th>Status</th>
                          <th>Membro</th>
                          <th>Tipo</th>
                          <th>Especialidade / Título</th>
                          <th>Data e Hora</th>
                          <th>Retorno</th>
                          <th>Resultado (Exame)</th>
                          <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consultasPaginadas.map((c) => {
                          const u = usuarios.find((x) => x.id === c.usuario_id)
                          const dataValida = c.data_agendada ? new Date(c.data_agendada) : null
                          const jaPassou = dataValida ? dataValida <= new Date() : false
                          const estaMarcado = !!selecionadosConsultas[c.id]

                          return (
                            <tr key={c.id} style={{ backgroundColor: estaMarcado ? 'var(--cor-primaria-suave)' : undefined }}>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={estaMarcado}
                                  onChange={(e) => {
                                    setSelecionadosConsultas({ ...selecionadosConsultas, [c.id]: e.target.checked })
                                  }}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-primaria)' }}
                                />
                              </td>
                              <td>
                                {c.status === 'a_agendar' && (
                                  <button
                                    type="button"
                                    onClick={() => abrirModalAgendar(c)}
                                    className="btn"
                                    style={{
                                      backgroundColor: '#fff7ed',
                                      color: '#c2410c',
                                      border: '1px solid #fdba74',
                                      padding: '4px 10px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      borderRadius: '9999px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="Clique para agendar com o médico e adicionar ao calendário"
                                  >
                                    📅 A Agendar
                                  </button>
                                )}

                                {c.status === 'agendado' && (
                                  <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start' }}>
                                    <button
                                      type="button"
                                      onClick={() => abrirModalConfirmar(c)}
                                      className="btn"
                                      style={{
                                        backgroundColor: '#eff6ff',
                                        color: '#1d4ed8',
                                        border: '1px solid #93c5fd',
                                        padding: '4px 10px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        borderRadius: '9999px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        whiteSpace: 'nowrap',
                                      }}
                                      title="Consulta com data marcada. Clique para confirmar a realização."
                                    >
                                      🗓️ Agendado
                                    </button>
                                    {jaPassou && (
                                      <button
                                        type="button"
                                        onClick={() => abrirModalConfirmar(c)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: 'var(--cor-sucesso)',
                                          fontSize: '0.7rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          padding: 0,
                                          textDecoration: 'underline',
                                        }}
                                        title="Data da consulta alcançada! Clique para confirmar que compareceu."
                                      >
                                        ⚠️ Confirmar Realização
                                      </button>
                                    )}
                                  </div>
                                )}

                                {c.status === 'concluido' && (
                                  <span
                                    style={{
                                      backgroundColor: '#ecfdf5',
                                      color: '#047857',
                                      border: '1px solid #6ee7b7',
                                      padding: '4px 10px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      borderRadius: '9999px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      whiteSpace: 'nowrap',
                                    }}
                                    title="Consulta/Exame realizada com sucesso"
                                  >
                                    ✅ Concluído
                                  </span>
                                )}
                              </td>
                              <td style={{ fontWeight: 600 }}>{u?.nome || 'Membro'}</td>
                              <td>
                                <span className={`badge ${c.tipo === 'consulta' ? 'badge-primary' : 'badge-secondary'}`}>
                                  {c.tipo === 'consulta' ? '🩺 Consulta' : '🧪 Exame'}
                                </span>
                              </td>
                              <td
                                onClick={() => setConsultaDetalhes(c)}
                                style={{
                                  textDecoration: c.status === 'concluido' ? 'line-through' : 'none',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                title="Clique para ver detalhes do atendimento"
                              >
                                {c.titulo}
                              </td>
                              <td>
                                {dataValida ? (
                                  dataValida.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                                ) : (
                                  <span style={{ color: '#c2410c', fontWeight: 600, fontSize: '0.8rem' }}>📅 A Definir</span>
                                )}
                              </td>
                              <td>{c.data_retorno ? new Date(c.data_retorno).toLocaleDateString('pt-BR') : '-'}</td>
                              
                              {/* Coluna RESULTADO (Apenas para Exames) */}
                              <td
                                onClick={() => setConsultaDetalhes(c)}
                                style={{
                                  maxWidth: '220px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontSize: '0.8rem',
                                  color: c.tipo === 'exame' && c.resultado ? 'var(--cor-primaria)' : 'var(--texto-secundario)',
                                  fontWeight: c.tipo === 'exame' && c.resultado ? 600 : 400,
                                  cursor: 'pointer',
                                }}
                                title={c.tipo === 'exame' ? (c.resultado || 'Sem resultado registrado') : 'Não se aplica a consultas'}
                              >
                                {c.tipo === 'exame' ? (c.resultado || '-') : '-'}
                              </td>

                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                  {c.status === 'a_agendar' && (
                                    <button
                                      type="button"
                                      onClick={() => abrirModalAgendar(c)}
                                      className="btn btn-primary"
                                      style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                      title="Agendar data com o médico"
                                    >
                                      📅 Agendar
                                    </button>
                                  )}
                                  {c.status === 'agendado' && (
                                    <button
                                      type="button"
                                      onClick={() => abrirModalConfirmar(c)}
                                      className="btn btn-secondary"
                                      style={{ padding: '3px 8px', fontSize: '0.75rem', color: 'var(--cor-sucesso)', fontWeight: 600 }}
                                      title="Confirmar que foi realizada"
                                    >
                                      ✅ Confirmar
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setConsultaDetalhes(c)}
                                    className="btn btn-secondary"
                                    style={{ padding: '3px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    title="Visualizar laudo, parâmetros e observações completos"
                                  >
                                    👁️ Detalhes
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => abrirEdicaoConsulta(c)}
                                    className="btn btn-secondary"
                                    style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                    title="Alterar consulta ou exame"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => excluirConsulta(c.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)', fontSize: '1rem' }}
                                    title="Excluir"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    {/* Paginação */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--borda)', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)' }}>
                        Exibindo <strong>{(paginaAtualConsultas - 1) * itensPorPaginaConsultas + 1}</strong> a{' '}
                        <strong>{Math.min(paginaAtualConsultas * itensPorPaginaConsultas, consultas.length)}</strong> de{' '}
                        <strong>{consultas.length}</strong> registros
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setPaginaAtualConsultas((p) => Math.max(1, p - 1))}
                          disabled={paginaAtualConsultas === 1}
                          className="btn btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                        >
                          ◀ Anterior
                        </button>

                        {Array.from({ length: totalPaginasConsultas }, (_, i) => i + 1).map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setPaginaAtualConsultas(num)}
                            className={`btn ${paginaAtualConsultas === num ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '4px 10px', fontSize: '0.8rem', minWidth: '32px' }}
                          >
                            {num}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => setPaginaAtualConsultas((p) => Math.min(totalPaginasConsultas, p + 1))}
                          disabled={paginaAtualConsultas === totalPaginasConsultas || totalPaginasConsultas === 0}
                          className="btn btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                        >
                          Próxima ▶
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: MÉTRICAS VITAIS                                   */}
      {/* ======================================================== */}
      {abaAtiva === 'metricas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>📊 Registrar Métrica de Saúde</h2>
            <form onSubmit={handleSalvarMetrica} style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
                <label className="form-label">Membro</label>
                <select className="input" value={metUsuarioId} onChange={(e) => setMetUsuarioId(e.target.value)}>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '160px' }}>
                <label className="form-label">Tipo de Métrica</label>
                <select className="input" value={metTipo} onChange={(e) => setMetTipo(e.target.value as any)}>
                  <option value="pressao">🩸 Pressão Arterial (ex: 120 / 80)</option>
                  <option value="glicemia">🍬 Glicemia (mg/dL)</option>
                  <option value="peso">⚖️ Peso Corporal (kg)</option>
                  <option value="altura">📏 Altura (cm)</option>
                  <option value="temperatura">🌡️ Temperatura (°C)</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '120px' }}>
                <label className="form-label">{metTipo === 'pressao' ? 'Sistólica (Maior)' : 'Valor'}</label>
                <input type="number" step="0.1" className="input" placeholder={metTipo === 'pressao' ? '120' : '0.0'} value={metVal1} onChange={(e) => setMetVal1(e.target.value)} required />
              </div>
              {metTipo === 'pressao' && (
                <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '120px' }}>
                  <label className="form-label">Diastólica (Menor)</label>
                  <input type="number" step="0.1" className="input" placeholder="80" value={metVal2} onChange={(e) => setMetVal2(e.target.value)} required />
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0, flex: 2, minWidth: '180px' }}>
                <label className="form-label">Observação (Opcional)</label>
                <input type="text" className="input" placeholder="Ex: Em jejum, Após treino" value={metObs} onChange={(e) => setMetObs(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvandoMetrica}>
                {salvandoMetrica ? 'Salvando...' : '+ Salvar Medição'}
              </button>
            </form>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Histórico de Medições Vitais</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)' }}>
                Total: <strong>{metricas.length}</strong> medições
              </div>
            </div>

            {/* Barra de Ações em Lote para Métricas */}
            {idsMetricasSelecionados.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--cor-primaria-suave)',
                  border: '1px solid var(--cor-primaria)',
                  borderRadius: 'var(--raio-md)',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--cor-primaria)' }}>
                  <span>📦</span>
                  <span>
                    {idsMetricasSelecionados.length}{' '}
                    {idsMetricasSelecionados.length === 1 ? 'medição selecionada' : 'medições selecionadas'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setNovoMembroMetricasLoteId(usuarios.length > 0 ? usuarios[0].id : '')
                      setModalAlterarMembroMetricasLoteAberto(true)
                    }}
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    👤 Alterar Membro ({idsMetricasSelecionados.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => executarAcaoLoteMetricas('excluir')}
                    disabled={executandoAcaoLoteMetricas}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--cor-perigo)', fontWeight: 600 }}
                  >
                    🗑️ Excluir Selecionadas
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelecionadosMetricas({})}
                    style={{ background: 'none', border: 'none', color: 'var(--texto-secundario)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Desmarcar todas
                  </button>
                </div>
              </div>
            )}

            {metricas.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '24px' }}>
                Nenhuma medição registrada ainda.
              </div>
            ) : (
              (() => {
                const totalPaginasMetricas = Math.ceil(metricas.length / itensPorPaginaMetricas) || 1
                const metricasPaginadas = metricas.slice(
                  (paginaAtualMetricas - 1) * itensPorPaginaMetricas,
                  paginaAtualMetricas * itensPorPaginaMetricas
                )

                const todasPaginaMarcadas =
                  metricasPaginadas.length > 0 &&
                  metricasPaginadas.every((m) => selecionadosMetricas[m.id])

                return (
                  <div className="tabela-container" style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}>
                    <table className="tabela" style={{ minWidth: '700px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={todasPaginaMarcadas}
                              onChange={(e) => {
                                const marcar = e.target.checked
                                const novo = { ...selecionadosMetricas }
                                metricasPaginadas.forEach((m) => {
                                  novo[m.id] = marcar
                                })
                                setSelecionadosMetricas(novo)
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-primaria)' }}
                              title="Selecionar todas desta página"
                            />
                          </th>
                          <th>Data e Hora</th>
                          <th>Membro</th>
                          <th>Tipo</th>
                          <th>Medição</th>
                          <th>Observação</th>
                          <th style={{ textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricasPaginadas.map((m) => {
                          const u = usuarios.find((x) => x.id === m.usuario_id)
                          const formatado =
                            m.tipo_metrica === 'pressao'
                              ? `${m.valor_principal} x ${m.valor_secundario} ${m.unidade}`
                              : `${m.valor_principal} ${m.unidade}`
                          const estaMarcada = !!selecionadosMetricas[m.id]

                          return (
                            <tr key={m.id} style={{ backgroundColor: estaMarcada ? 'var(--cor-primaria-suave)' : undefined }}>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={estaMarcada}
                                  onChange={(e) => {
                                    setSelecionadosMetricas({ ...selecionadosMetricas, [m.id]: e.target.checked })
                                  }}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-primaria)' }}
                                />
                              </td>
                              <td>{new Date(m.data_medicao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                              <td style={{ fontWeight: 600 }}>{u?.nome || 'Membro'}</td>
                              <td>
                                <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>
                                  {m.tipo_metrica}
                                </span>
                              </td>
                              <td style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--cor-primaria)' }}>{formatado}</td>
                              <td>{m.observacao || '-'}</td>
                              <td style={{ textAlign: 'right' }}>
                                <button type="button" onClick={() => excluirMetrica(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    {/* Paginação */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--borda)', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)' }}>
                        Exibindo <strong>{(paginaAtualMetricas - 1) * itensPorPaginaMetricas + 1}</strong> a{' '}
                        <strong>{Math.min(paginaAtualMetricas * itensPorPaginaMetricas, metricas.length)}</strong> de{' '}
                        <strong>{metricas.length}</strong> medições
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setPaginaAtualMetricas((p) => Math.max(1, p - 1))}
                          disabled={paginaAtualMetricas === 1}
                          className="btn btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                        >
                          ◀ Anterior
                        </button>

                        {Array.from({ length: totalPaginasMetricas }, (_, i) => i + 1).map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setPaginaAtualMetricas(num)}
                            className={`btn ${paginaAtualMetricas === num ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: '4px 10px', fontSize: '0.8rem', minWidth: '32px' }}
                          >
                            {num}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={() => setPaginaAtualMetricas((p) => Math.min(totalPaginasMetricas, p + 1))}
                          disabled={paginaAtualMetricas === totalPaginasMetricas || totalPaginasMetricas === 0}
                          className="btn btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                        >
                          Próxima ▶
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL MODO SOS EMERGÊNCIA                                */}
      {/* ======================================================== */}
      {modalSosAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--cor-perigo)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.75rem' }}>🚨</span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--cor-perigo)' }}>Cartão SOS & Emergência Familiar</h2>
              </div>
              <button type="button" onClick={() => setModalSosAberto(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Telefones de Emergência Rápida */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <a href="tel:192" style={{ textDecoration: 'none', padding: '12px', backgroundColor: 'var(--cor-perigo-suave)', borderRadius: 'var(--raio-md)', border: '1px solid var(--cor-perigo)', textAlign: 'center', color: 'var(--cor-perigo)' }}>
                <div style={{ fontSize: '1.5rem' }}>🚑 192</div>
                <strong style={{ fontSize: '0.85rem' }}>Ligar para SAMU</strong>
              </a>
              <a href="tel:193" style={{ textDecoration: 'none', padding: '12px', backgroundColor: 'var(--cor-alerta-suave)', borderRadius: 'var(--raio-md)', border: '1px solid var(--cor-alerta)', textAlign: 'center', color: 'var(--cor-alerta)' }}>
                <div style={{ fontSize: '1.5rem' }}>🚒 193</div>
                <strong style={{ fontSize: '0.85rem' }}>Ligar Bombeiros</strong>
              </a>
              <a href="tel:190" style={{ textDecoration: 'none', padding: '12px', backgroundColor: 'var(--cor-primaria-suave)', borderRadius: 'var(--raio-md)', border: '1px solid var(--cor-primaria)', textAlign: 'center', color: 'var(--cor-primaria)' }}>
                <div style={{ fontSize: '1.5rem' }}>🚓 190</div>
                <strong style={{ fontSize: '0.85rem' }}>Ligar Polícia</strong>
              </a>
            </div>

            {/* Dados Médicos Vitais dos Membros */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Fichas Médicas de Prontidão:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {fichas.map((f) => {
                const u = usuarios.find((x) => x.id === f.usuario_id)
                return (
                  <div key={f.id} style={{ padding: '14px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)', border: '1px solid var(--borda)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '1.05rem' }}>{u?.nome}</strong>
                      <span className="badge badge-danger" style={{ fontSize: '0.85rem' }}>Tipo Sanguíneo: {f.tipo_sanguineo}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>⚠️ <strong>Alergias Críticas:</strong> {f.alergias}</div>
                      <div>💊 <strong>Uso Contínuo:</strong> {f.medicamentos_uso_continuo}</div>
                      <div>🏥 <strong>Plano de Saúde:</strong> {f.numero_plano_saude}</div>
                      {f.numero_plano_odontologico && (
                        <div>🦷 <strong>Plano Odontológico:</strong> {f.numero_plano_odontologico}</div>
                      )}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {f.carteirinha_plano_url && (
                          <a
                            href={f.carteirinha_plano_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: 700 }}
                          >
                            💳 Carteirinha Saúde ({u?.nome})
                          </a>
                        )}
                        {f.carteirinha_odonto_url && (
                          <a
                            href={f.carteirinha_odonto_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: 700 }}
                          >
                            🦷 Carteirinha Odonto ({u?.nome})
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button type="button" onClick={() => setModalSosAberto(false)} className="btn btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE REVISÃO E CONFIRMAÇÃO DE MÚLTIPLOS EXAMES COM IA */}
      {/* ======================================================== */}
      {modalIaAberto && laudoExtraido && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '820px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--cor-primaria)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '2rem' }}>🔬</span>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--cor-primaria)' }}>
                    Laudo Analisado: {laudoExtraido.exames?.length || 0} Exame(s) Identificado(s)
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)' }}>
                    O Gemini identificou todos os exames contidos no documento. Selecione os que deseja registrar.
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setModalIaAberto(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            {/* Cabeçalho do Laudo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px', padding: '14px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--raio-md)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Membro da Família</label>
                <select className="input" value={iaMembroId} onChange={(e) => setIaMembroId(e.target.value)}>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Laboratório / Clínica</label>
                <input
                  type="text"
                  className="input"
                  value={laudoExtraido.laboratorio_ou_clinica || ''}
                  onChange={(e) => setLaudoExtraido({ ...laudoExtraido, laboratorio_ou_clinica: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data Geral do Laudo</label>
                <input
                  type="date"
                  className="input"
                  value={laudoExtraido.data_geral || new Date().toISOString().split('T')[0]}
                  onChange={(e) => setLaudoExtraido({ ...laudoExtraido, data_geral: e.target.value })}
                />
              </div>

              {iaLinkAnexo && (
                <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                  <a
                    href={iaLinkAnexo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  >
                    📄 Abrir Arquivo Original Enviado ({arquivoIa?.name || 'Ver Documento'})
                  </a>
                </div>
              )}
            </div>

            {/* Lista Discriminada de Todos os Exames */}
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>
              Exames Encontrados no Arquivo:
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
              {laudoExtraido.exames?.map((ex: any, idx: number) => {
                const selecionado = examesSelecionados[idx] ?? true
                return (
                  <div
                    key={idx}
                    style={{
                      border: selecionado ? '2px solid var(--cor-primaria)' : '1px solid var(--borda)',
                      borderRadius: 'var(--raio-md)',
                      padding: '16px',
                      backgroundColor: selecionado ? 'var(--bg-card)' : 'var(--bg-hover)',
                      opacity: selecionado ? 1 : 0.6,
                      transition: 'all var(--transicao-rapida)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '1.05rem' }}>
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={() =>
                            setExamesSelecionados((prev) => ({
                              ...prev,
                              [idx]: !selecionado,
                            }))
                          }
                          style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--cor-primaria)' }}
                        />
                        <span>🩺 {ex.titulo_exame}</span>
                      </label>

                      <span className="badge badge-primary">
                        {ex.resultados?.length || 0} parâmetro(s)
                      </span>
                    </div>

                    {ex.conclusao_ou_interpretacao && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginBottom: '10px', padding: '8px 12px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--raio-sm)' }}>
                        <strong>Laudo / Impressão:</strong> {ex.conclusao_ou_interpretacao}
                      </div>
                    )}

                    {/* Tabela de Resultados do Exame */}
                    {ex.resultados && ex.resultados.length > 0 && (
                      <div className="tabela-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        <table className="tabela" style={{ fontSize: '0.8rem' }}>
                          <thead>
                            <tr>
                              <th>Parâmetro / Analito</th>
                              <th>Resultado</th>
                              <th>Referência</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ex.resultados.map((r: any, rIdx: number) => (
                              <tr key={rIdx}>
                                <td style={{ fontWeight: 600 }}>{r.nome_parametro}</td>
                                <td style={{ color: 'var(--cor-primaria)', fontWeight: 700 }}>
                                  {r.resultado} {r.unidade || ''}
                                </td>
                                <td>{r.valor_referencia || '-'}</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      r.status_resultado === 'alterado_alto' || r.status_resultado === 'alterado_baixo'
                                        ? 'badge-danger'
                                        : 'badge-success'
                                    }`}
                                  >
                                    {r.status_resultado || 'normal'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setModalIaAberto(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarExamesIaNoSistema}
                disabled={salvandoExamesIa}
                className="btn btn-primary"
                style={{ fontWeight: 700, padding: '10px 20px' }}
              >
                {salvandoExamesIa ? 'Registrando Todos...' : '💾 Confirmar e Registrar Todos os Exames'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: AGENDAR CONSULTA / EXAME RÁPIDO                 */}
      {/* ======================================================== */}
      {consultaAgendando && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', backgroundColor: 'var(--bg-card)', border: '2px solid #fdba74', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>🗓️</span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Agendar com Médico: {consultaAgendando.titulo}
                </h2>
              </div>
              <button type="button" onClick={() => setConsultaAgendando(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginBottom: '16px' }}>
              Defina a data/hora marcada com o médico ou clínica. O status mudará automaticamente para <strong>Agendado</strong> e será sincronizado com a Agenda Familiar.
            </p>

            <form onSubmit={handleAgendarRapido} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Médico / Contato da Agenda</label>
                <select
                  className="input"
                  value={agendarContatoId}
                  onChange={(e) => {
                    const cid = e.target.value
                    setAgendarContatoId(cid)
                    const sel = contatosAgenda.find((x) => x.id === cid)
                    if (sel) {
                      setAgendarClinica(`${sel.nome}${sel.especialidade ? ` (${sel.especialidade})` : ''}`)
                    }
                  }}
                >
                  <option value="">-- Selecionar da Agenda de Contatos --</option>
                  {contatosAgenda.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.especialidade ? `• ${c.especialidade}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {agendarContatoId && (
                (() => {
                  const sel = contatosAgenda.find((x) => x.id === agendarContatoId)
                  if (!sel?.telefone) return null
                  const limpo = sel.telefone.replace(/\D/g, '')
                  return (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--bg-hover)', padding: '10px', borderRadius: 'var(--raio-sm)' }}>
                      <span style={{ fontSize: '0.85rem' }}>Contato do Médico: <strong>{sel.telefone}</strong></span>
                      <a href={`tel:${limpo}`} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}>
                        📞 Ligar
                      </a>
                      <a href={`https://wa.me/${limpo}`} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem', textDecoration: 'none' }}>
                        💬 WhatsApp
                      </a>
                    </div>
                  )
                })()
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Clínica / Consultório</label>
                <input
                  type="text"
                  className="input"
                  value={agendarClinica}
                  onChange={(e) => setAgendarClinica(e.target.value)}
                  placeholder="Ex: Consultório Dr. André"
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data e Hora Marcada *</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={agendarData}
                  onChange={(e) => setAgendarData(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  id="agendarSincronizar"
                  checked={agendarSincronizar}
                  onChange={(e) => setAgendarSincronizar(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-primaria)' }}
                />
                <label htmlFor="agendarSincronizar" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                  📅 Criar evento na Agenda Familiar e no Google Calendar
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setConsultaAgendando(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoAgendamento} className="btn btn-primary" style={{ fontWeight: 700 }}>
                  {salvandoAgendamento ? 'Salvando...' : 'Salvar e Marcar como Agendado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CONFIRMAR REALIZAÇÃO (CONCLUÍDO)                 */}
      {/* ======================================================== */}
      {consultaConfirmando && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--cor-sucesso)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Confirmar Realização: {consultaConfirmando.titulo}
                </h2>
              </div>
              <button type="button" onClick={() => setConsultaConfirmando(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginBottom: '14px' }}>
              {consultaConfirmando.tipo === 'consulta'
                ? 'Registre abaixo o que o médico orientou durante o atendimento (conduta, receitas, cuidados).'
                : 'Registre abaixo o resultado ou laudo emitido pelo laboratório/clínica.'}
            </p>

            <form onSubmit={handleConfirmarRealizacao} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {consultaConfirmando.tipo === 'consulta' ? (
                <>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Observações Médicas / Conduta da Consulta</label>
                    <textarea
                      className="input"
                      rows={4}
                      placeholder="Ex: Dr. solicitou exames de sangue, receitou vitamina D 2.000 UI por dia e recomendou caminhadas 3x por semana."
                      value={confirmarObs}
                      onChange={(e) => setConfirmarObs(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Data de Retorno Prevista (Opcional)</label>
                    <input
                      type="date"
                      className="input"
                      value={confirmarRetorno}
                      onChange={(e) => setConfirmarRetorno(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Resultado do Exame (Parâmetros / Laudo)</label>
                    <textarea
                      className="input"
                      rows={4}
                      placeholder="Ex: Glicemia de Jejum: 89 mg/dL; Hemoglobina Glicada: 5.4%; Colesterol Total: 165 mg/dL. Conclusão: Todos parâmetros normais."
                      value={confirmarResultado}
                      onChange={(e) => setConfirmarResultado(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Observações / Anotações Complementares</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Ex: Exame colhido em jejum de 12 horas"
                      value={confirmarObs}
                      onChange={(e) => setConfirmarObs(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Anexar Arquivo ou Foto do Laudo (Opcional)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="input"
                      style={{ padding: '7px 12px' }}
                      onChange={(e) => setConfirmarArquivo(e.target.files?.[0] || null)}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setConsultaConfirmando(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoConfirmacao} className="btn btn-primary" style={{ fontWeight: 700 }}>
                  {salvandoConfirmacao ? 'Salvando...' : 'Concluir e Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE EDIÇÃO DE CONSULTA / EXAME                      */}
      {/* ======================================================== */}
      {consultaEditando && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--cor-primaria)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>✏️</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Editar {consultaEditando.tipo === 'consulta' ? 'Consulta Médica' : 'Exame Laboratorial'}
                </h2>
              </div>
              <button type="button" onClick={() => setConsultaEditando(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSalvarEdicaoConsulta} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Membro da Família</label>
                <select className="input" value={editConUsuarioId} onChange={(e) => setEditConUsuarioId(e.target.value)}>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo</label>
                <select className="input" value={editConTipo} onChange={(e) => setEditConTipo(e.target.value as any)}>
                  <option value="consulta">🩺 Consulta Médica</option>
                  <option value="exame">🧪 Exame / Laboratório</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <select className="input" value={editConStatus} onChange={(e) => setEditConStatus(e.target.value as any)}>
                  <option value="a_agendar">📅 A Agendar</option>
                  <option value="agendado">🗓️ Agendado</option>
                  <option value="concluido">✅ Concluído</option>
                  <option value="cancelado">❌ Cancelado</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                <label className="form-label">Título / Especialidade</label>
                <input type="text" className="input" value={editConTitulo} onChange={(e) => setEditConTitulo(e.target.value)} required />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Médico / Contato da Agenda</label>
                <select
                  className="input"
                  value={editConContatoId}
                  onChange={(e) => {
                    const cid = e.target.value
                    setEditConContatoId(cid)
                    const sel = contatosAgenda.find((x) => x.id === cid)
                    if (sel) {
                      setEditConClinica(`${sel.nome}${sel.especialidade ? ` (${sel.especialidade})` : ''}`)
                    }
                  }}
                >
                  <option value="">-- Nenhum / Digitar manualmente --</option>
                  {contatosAgenda.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.especialidade ? `• ${c.especialidade}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Clínica / Consultório</label>
                <input type="text" className="input" value={editConClinica} onChange={(e) => setEditConClinica(e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data e Hora Agendada</label>
                <input type="datetime-local" className="input" value={editConData} onChange={(e) => setEditConData(e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data de Retorno (Opcional)</label>
                <input type="date" className="input" value={editConRetorno} onChange={(e) => setEditConRetorno(e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Link do Laudo / Arquivo</label>
                <input type="url" className="input" placeholder="https://..." value={editConLinkAnexo} onChange={(e) => setEditConLinkAnexo(e.target.value)} />
              </div>

              {editConTipo === 'exame' ? (
                <>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">Resultado do Exame (Parâmetros / Valores)</label>
                    <textarea className="input" rows={3} value={editConResultado} onChange={(e) => setEditConResultado(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                    <label className="form-label">Observações / Preparo</label>
                    <input type="text" className="input" value={editConObs} onChange={(e) => setEditConObs(e.target.value)} />
                  </div>
                </>
              ) : (
                <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                  <label className="form-label">Observações Médicas / Conduta da Consulta</label>
                  <textarea className="input" rows={3} value={editConObs} onChange={(e) => setEditConObs(e.target.value)} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', gridColumn: '1 / -1', marginTop: '10px' }}>
                <button type="button" onClick={() => setConsultaEditando(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoEdicaoConsulta} className="btn btn-primary" style={{ fontWeight: 700 }}>
                  {salvandoEdicaoConsulta ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DETALHES COMPLETOS DE CONSULTA / EXAME             */}
      {/* ======================================================== */}
      {consultaDetalhes && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10003, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '680px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--cor-primaria)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.75rem' }}>{consultaDetalhes.tipo === 'consulta' ? '🩺' : '🧪'}</span>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{consultaDetalhes.titulo}</h2>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <span className={`badge ${consultaDetalhes.tipo === 'consulta' ? 'badge-primary' : 'badge-secondary'}`}>
                      {consultaDetalhes.tipo === 'consulta' ? 'Consulta Médica' : 'Exame Laboratorial'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        backgroundColor: consultaDetalhes.status === 'concluido' ? '#ecfdf5' : consultaDetalhes.status === 'a_agendar' ? '#fff7ed' : '#eff6ff',
                        color: consultaDetalhes.status === 'concluido' ? '#047857' : consultaDetalhes.status === 'a_agendar' ? '#c2410c' : '#1d4ed8',
                        border: `1px solid ${consultaDetalhes.status === 'concluido' ? '#6ee7b7' : consultaDetalhes.status === 'a_agendar' ? '#fdba74' : '#93c5fd'}`,
                      }}
                    >
                      {consultaDetalhes.status === 'concluido' ? '✅ Concluído' : consultaDetalhes.status === 'a_agendar' ? '📅 A Agendar' : '🗓️ Agendado'}
                    </span>
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setConsultaDetalhes(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px', backgroundColor: 'var(--bg-hover)', padding: '14px', borderRadius: 'var(--raio-md)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>PACIENTE / MEMBRO:</span>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                  {usuarios.find((u) => u.id === consultaDetalhes.usuario_id)?.nome || 'Membro'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>MÉDICO / CLÍNICA / LAB:</span>
                <div style={{ fontWeight: 600 }}>{consultaDetalhes.especialista_ou_clinica || '-'}</div>
                {(() => {
                  const contato = contatosAgenda.find((x) => x.id === consultaDetalhes.contato_id)
                  if (!contato?.telefone) return null
                  const limpo = contato.telefone.replace(/\D/g, '')
                  return (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <a href={`tel:${limpo}`} style={{ fontSize: '0.75rem', color: 'var(--cor-primaria)', textDecoration: 'none' }}>
                        📞 {contato.telefone}
                      </a>
                      <a href={`https://wa.me/${limpo}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#16a34a', textDecoration: 'none' }}>
                        💬 WhatsApp
                      </a>
                    </div>
                  )
                })()}
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>DATA E HORA:</span>
                <div style={{ fontWeight: 600 }}>
                  {consultaDetalhes.data_agendada
                    ? new Date(consultaDetalhes.data_agendada).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    : 'A definir'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>DATA DE RETORNO:</span>
                <div style={{ fontWeight: 600 }}>
                  {consultaDetalhes.data_retorno ? new Date(consultaDetalhes.data_retorno).toLocaleDateString('pt-BR') : 'Sem retorno previsto'}
                </div>
              </div>
            </div>

            {consultaDetalhes.link_anexo && (
              <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--cor-primaria-suave)', borderRadius: 'var(--raio-md)', border: '1px solid var(--cor-primaria)' }}>
                <a
                  href={consultaDetalhes.link_anexo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontWeight: 700 }}
                >
                  📄 Abrir Documento / Laudo Original (PDF / Imagem)
                </a>
              </div>
            )}

            {/* SEGREGAÇÃO CLARA: RESULTADO (EXAME) VS OBSERVAÇÕES / CONDUTA (CONSULTA) */}
            {consultaDetalhes.tipo === 'exame' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--cor-primaria)' }}>
                    🧪 Resultado do Exame (Parâmetros / Laudo):
                  </h3>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.9rem', backgroundColor: 'var(--bg-hover)', padding: '14px', borderRadius: 'var(--raio-md)', border: '1px solid var(--borda)' }}>
                    {consultaDetalhes.resultado || 'Nenhum resultado registrado ainda.'}
                  </div>
                </div>

                {consultaDetalhes.observacoes && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px', color: 'var(--texto-secundario)' }}>
                      📝 Instruções de Preparo / Observações Gerais:
                    </h4>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', fontSize: '0.85rem', backgroundColor: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--raio-md)', border: '1px solid var(--borda)' }}>
                      {consultaDetalhes.observacoes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--cor-primaria)' }}>
                  🩺 Observações Médicas / Conduta da Consulta:
                </h3>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.9rem', backgroundColor: 'var(--bg-hover)', padding: '14px', borderRadius: 'var(--raio-md)', border: '1px solid var(--borda)' }}>
                  {consultaDetalhes.observacoes || 'Nenhuma anotação médica ou conduta registrada para esta consulta.'}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              {consultaDetalhes.status === 'a_agendar' && (
                <button
                  type="button"
                  onClick={() => {
                    const item = consultaDetalhes
                    setConsultaDetalhes(null)
                    abrirModalAgendar(item)
                  }}
                  className="btn btn-primary"
                  style={{ fontWeight: 700 }}
                >
                  📅 Agendar Agora
                </button>
              )}
              {consultaDetalhes.status === 'agendado' && (
                <button
                  type="button"
                  onClick={() => {
                    const item = consultaDetalhes
                    setConsultaDetalhes(null)
                    abrirModalConfirmar(item)
                  }}
                  className="btn btn-primary"
                  style={{ fontWeight: 700 }}
                >
                  ✅ Confirmar Realização
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const item = consultaDetalhes
                  setConsultaDetalhes(null)
                  abrirEdicaoConsulta(item)
                }}
                className="btn btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                ✏️ Editar Registro
              </button>
              <button type="button" onClick={() => setConsultaDetalhes(null)} className="btn btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE EDIÇÃO DE FICHA MÉDICA                          */}
      {/* ======================================================== */}
      {fichaEditando && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10002, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--cor-perigo)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>✏️</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Alterar Ficha Médica de Emergência</h2>
              </div>
              <button type="button" onClick={() => setFichaEditando(null)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleSalvarEdicaoFicha} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Membro da Família</label>
                <select className="input" value={editFichaUsuarioId} onChange={(e) => setEditFichaUsuarioId(e.target.value)}>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Tipo Sanguíneo</label>
                <select className="input" value={editTipoSanguineo} onChange={(e) => setEditTipoSanguineo(e.target.value)}>
                  <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                <label className="form-label">Alergias Conhecidas</label>
                <input type="text" className="input" value={editAlergias} onChange={(e) => setEditAlergias(e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                <label className="form-label">Medicamentos de Uso Contínuo</label>
                <input type="text" className="input" value={editMedicamentosContinuos} onChange={(e) => setEditMedicamentosContinuos(e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nº do Plano de Saúde</label>
                <input type="text" className="input" value={editPlanoSaude} onChange={(e) => setEditPlanoSaude(e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nova Carteirinha Saúde (Foto/PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="input"
                  style={{ padding: '7px 12px' }}
                  onChange={(e) => setEditArquivoCarteirinha(e.target.files?.[0] || null)}
                />
              </div>

              {editCarteirinhaUrl && (
                <div style={{ gridColumn: '1 / -1', marginTop: '2px' }}>
                  <a
                    href={editCarteirinhaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    💳 Visualizar Carteirinha de Saúde Atual
                  </a>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Plano Odontológico</label>
                <input type="text" className="input" placeholder="Ex: Amil Dental 123456" value={editPlanoOdonto} onChange={(e) => setEditPlanoOdonto(e.target.value)} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nova Carteirinha Odonto (Foto/PDF)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="input"
                  style={{ padding: '7px 12px' }}
                  onChange={(e) => setEditArquivoCarteirinhaOdonto(e.target.files?.[0] || null)}
                />
              </div>

              {editCarteirinhaOdontoUrl && (
                <div style={{ gridColumn: '1 / -1', marginTop: '2px' }}>
                  <a
                    href={editCarteirinhaOdontoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    🦷 Visualizar Carteirinha Odontológica Atual
                  </a>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', gridColumn: '1 / -1', marginTop: '10px' }}>
                <button type="button" onClick={() => setFichaEditando(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoEdicaoFicha} className="btn btn-primary" style={{ fontWeight: 700 }}>
                  {salvandoEdicaoFicha ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: HISTÓRICO DE CHECK-IN DE HUMOR DA FAMÍLIA         */}
      {/* ======================================================== */}
      {modalHistoricoHumorAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10006, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '640px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--cor-primaria)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>📊</span>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Histórico de Humor & Bem-Estar Familiar
                </h2>
              </div>
              <button type="button" onClick={() => setModalHistoricoHumorAberto(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginBottom: '16px' }}>
              Acompanhamento cronológico do sentimento de cada membro e os motivos registrados.
            </p>

            {historicoCheckins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--texto-secundario)' }}>
                Nenhum check-in registrado ainda.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {historicoCheckins.map((chk) => {
                  const u = usuarios.find((x) => x.id === chk.usuario_id)
                  const infoHumor = emojisHumor.find((e) => e.nivel === chk.nivel_humor) || emojisHumor[2]
                  const motivoOuNota = chk.motivo || chk.notas_diario

                  return (
                    <div
                      key={chk.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--raio-md)',
                        backgroundColor: 'var(--bg-hover)',
                        borderLeft: `4px solid ${
                          chk.nivel_humor >= 4 ? 'var(--cor-sucesso)' : chk.nivel_humor === 3 ? '#3b82f6' : 'var(--cor-perigo)'
                        }`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: '220px' }}>
                        <span style={{ fontSize: '1.75rem' }}>{infoHumor.emoji}</span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{u?.nome || 'Membro da Família'}</strong>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--bg-card)',
                                color: chk.nivel_humor >= 4 ? 'var(--cor-sucesso)' : chk.nivel_humor === 3 ? '#2563eb' : 'var(--cor-perigo)',
                              }}
                            >
                              {infoHumor.label}
                            </span>
                          </div>

                          {motivoOuNota ? (
                            <div style={{ fontSize: '0.85rem', marginTop: '4px', color: 'var(--texto-principal)', fontStyle: 'italic' }}>
                              &ldquo;{motivoOuNota}&rdquo;
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                              Sem motivo detalhado informado
                            </div>
                          )}

                          <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>
                            📅 {new Date(chk.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => excluirCheckinHumor(chk.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)', fontSize: '0.9rem', padding: '4px' }}
                        title="Excluir este registro"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button type="button" onClick={() => setModalHistoricoHumorAberto(false)} className="btn btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ALTERAR MEMBRO EM LOTE PARA CONSULTAS / EXAMES    */}
      {/* ======================================================== */}
      {modalAlterarMembroLoteAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10006, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--cor-primaria)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>👤</span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Transferir Membro em Lote
                </h2>
              </div>
              <button type="button" onClick={() => setModalAlterarMembroLoteAberto(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginBottom: '16px' }}>
              Selecione para qual membro da família você deseja atribuir os <strong>{idsConsultasSelecionados.length}</strong> exames/consultas selecionados:
            </p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Novo Membro Responsável</label>
              <select
                className="input"
                value={novoMembroLoteId}
                onChange={(e) => setNovoMembroLoteId(e.target.value)}
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setModalAlterarMembroLoteAberto(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executarAlterarMembroLote(novoMembroLoteId)}
                disabled={executandoAcaoLote || !novoMembroLoteId}
                className="btn btn-primary"
                style={{ fontWeight: 700 }}
              >
                {executandoAcaoLote ? 'Transferindo...' : 'Confirmar Transferência'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ALTERAR MEMBRO EM LOTE PARA MÉTRICAS VITAIS       */}
      {/* ======================================================== */}
      {modalAlterarMembroMetricasLoteAberto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10006, padding: '16px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-card)', border: '2px solid var(--cor-primaria)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.5rem' }}>👤</span>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  Transferir Medições em Lote
                </h2>
              </div>
              <button type="button" onClick={() => setModalAlterarMembroMetricasLoteAberto(false)} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginBottom: '16px' }}>
              Selecione para qual membro da família você deseja atribuir as <strong>{idsMetricasSelecionados.length}</strong> medições vitais selecionadas:
            </p>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">Novo Membro Responsável</label>
              <select
                className="input"
                value={novoMembroMetricasLoteId}
                onChange={(e) => setNovoMembroMetricasLoteId(e.target.value)}
              >
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setModalAlterarMembroMetricasLoteAberto(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executarAlterarMembroMetricasLote(novoMembroMetricasLoteId)}
                disabled={executandoAcaoLoteMetricas || !novoMembroMetricasLoteId}
                className="btn btn-primary"
                style={{ fontWeight: 700 }}
              >
                {executandoAcaoLoteMetricas ? 'Transferindo...' : 'Confirmar Transferência'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
