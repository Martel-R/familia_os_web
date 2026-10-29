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
  data_agendada: string
  data_retorno?: string
  observacoes?: string
  concluido: boolean
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

export default function SaudePage() {
  const [abaAtiva, setAbaAtiva] = useState<'geral' | 'medicamentos' | 'vacinas' | 'consultas' | 'metricas'>('geral')
  const [modalSosAberto, setModalSosAberto] = useState(false)

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [usuarioLogadoId, setUsuarioLogadoId] = useState<string>('')
  const [carregando, setCarregando] = useState(true)

  // Dados
  const [humorSelecionado, setHumorSelecionado] = useState<number | null>(null)
  const [salvandoHumor, setSalvandoHumor] = useState(false)
  const [fichas, setFichas] = useState<FichaMedica[]>([])
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [vacinas, setVacinas] = useState<Vacina[]>([])
  const [consultas, setConsultas] = useState<ConsultaExame[]>([])
  const [metricas, setMetricas] = useState<MetricaVital[]>([])

  // Formulário Ficha
  const [fichaUsuarioId, setFichaUsuarioId] = useState('')
  const [tipoSanguineo, setTipoSanguineo] = useState('O+')
  const [alergias, setAlergias] = useState('')
  const [medicamentosContinuos, setMedicamentosContinuos] = useState('')
  const [planoSaude, setPlanoSaude] = useState('')
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

  // Formulário Consulta/Exame
  const [conUsuarioId, setConUsuarioId] = useState('')
  const [conTipo, setConTipo] = useState<'consulta' | 'exame'>('consulta')
  const [conTitulo, setConTitulo] = useState('')
  const [conClinica, setConClinica] = useState('')
  const [conData, setConData] = useState('')
  const [conRetorno, setConRetorno] = useState('')
  const [conObs, setConObs] = useState('')
  const [salvandoConsulta, setSalvandoConsulta] = useState(false)

  // Formulário Métrica Vital
  const [metUsuarioId, setMetUsuarioId] = useState('')
  const [metTipo, setMetTipo] = useState<'pressao' | 'glicemia' | 'peso' | 'altura' | 'temperatura'>('pressao')
  const [metVal1, setMetVal1] = useState('')
  const [metVal2, setMetVal2] = useState('')
  const [metObs, setMetObs] = useState('')
  const [salvandoMetrica, setSalvandoMetrica] = useState(false)

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

      const [resFichas, resMeds, resVacinas, resConsultas, resMetricas] = await Promise.all([
        supabase.from('saude_fichas_medicas').select('*'),
        supabase.from('saude_medicamentos').select('*').order('horario'),
        supabase.from('saude_vacinacao').select('*').order('data_aplicacao', { ascending: false }),
        supabase.from('saude_consultas_exames').select('*').order('data_agendada', { ascending: true }),
        supabase.from('saude_metricas_vitais').select('*').order('data_medicao', { ascending: false }),
      ])

      if (resFichas.data) setFichas(resFichas.data)
      if (resMeds.data) setMedicamentos(resMeds.data)
      if (resVacinas.data) setVacinas(resVacinas.data)
      if (resConsultas.data) setConsultas(resConsultas.data)
      if (resMetricas.data) setMetricas(resMetricas.data)

      if (usuarioLogadoId) {
        const { data: checkins } = await supabase
          .from('saude_checkins')
          .select('nivel_humor')
          .eq('usuario_id', usuarioLogadoId)
          .order('criado_em', { ascending: false })
          .limit(1)

        if (checkins && checkins.length > 0) {
          setHumorSelecionado(checkins[0].nivel_humor)
        }
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [usuarioLogadoId])

  // --- REGISTRAR HUMOR ---
  const registrarHumor = async (nivel: number) => {
    if (!usuarioLogadoId) return alert('Você precisa estar autenticado para registrar humor.')
    setHumorSelecionado(nivel)
    setSalvandoHumor(true)
    try {
      await supabase.from('saude_checkins').insert([{ usuario_id: usuarioLogadoId, nivel_humor: nivel }])
    } finally {
      setSalvandoHumor(false)
    }
  }

  // --- CRUD FICHA MÉDICA ---
  const handleSalvarFicha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fichaUsuarioId || salvandoFicha) return
    setSalvandoFicha(true)
    try {
      const payload = {
        usuario_id: fichaUsuarioId,
        tipo_sanguineo: tipoSanguineo,
        alergias: alergias || 'Nenhuma',
        medicamentos_uso_continuo: medicamentosContinuos || 'Nenhum',
        numero_plano_saude: planoSaude || 'Não informado',
      }
      const { error } = await supabase.from('saude_fichas_medicas').insert([payload])
      if (error) throw error
      await carregarDados()
      setAlergias('')
      setMedicamentosContinuos('')
      setPlanoSaude('')
      alert('Ficha médica salva com sucesso!')
    } catch (err: any) {
      alert('Erro ao salvar ficha: ' + err.message)
    } finally {
      setSalvandoFicha(false)
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

  // --- CRUD CONSULTAS / EXAMES ---
  const handleSalvarConsulta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!conUsuarioId || !conTitulo || !conData || salvandoConsulta) return
    setSalvandoConsulta(true)
    try {
      const payload = {
        usuario_id: conUsuarioId,
        tipo: conTipo,
        titulo: conTitulo,
        especialista_ou_clinica: conClinica || null,
        data_agendada: new Date(conData).toISOString(),
        data_retorno: conRetorno || null,
        observacoes: conObs || null,
        concluido: false,
      }
      const { error } = await supabase.from('saude_consultas_exames').insert([payload])
      if (error) throw error
      await carregarDados()
      setConTitulo('')
      setConClinica('')
      setConData('')
      setConRetorno('')
      setConObs('')
    } catch (err: any) {
      alert('Erro ao agendar consulta/exame: ' + err.message)
    } finally {
      setSalvandoConsulta(false)
    }
  }

  const toggleConcluidoConsulta = async (c: ConsultaExame) => {
    const novo = !c.concluido
    try {
      setConsultas(consultas.map((item) => (item.id === c.id ? { ...item, concluido: novo } : item)))
      await supabase.from('saude_consultas_exames').update({ concluido: novo }).eq('id', c.id)
    } catch (err) {
      console.error(err)
      carregarDados()
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

  return (
    <div>
      {/* Topo / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Saúde Integral & Bem-Estar Familiar
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Check-in diário, medicamentos, vacinas, exames, diário de métricas e atendimento SOS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalSosAberto(true)}
          className="btn btn-danger"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 700 }}
        >
          🚨 MODO SOS (Emergência)
        </button>
      </div>

      {/* Check-in Diário de Humor (Visível em destaque) */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>Como você está se sentindo hoje?</h2>
        <p style={{ color: 'var(--texto-secundario)', fontSize: '0.8rem', marginBottom: '16px' }}>
          {salvandoHumor ? 'Registrando seu sentimento no banco...' : 'Clique em um emoji para salvar o registro do dia no histórico.'}
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          {emojisHumor.map((item) => {
            const selecionado = humorSelecionado === item.nivel
            return (
              <button
                key={item.nivel}
                type="button"
                onClick={() => registrarHumor(item.nivel)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 18px',
                  borderRadius: 'var(--raio-lg)',
                  border: selecionado ? '2px solid var(--cor-primaria)' : '1px solid var(--borda)',
                  backgroundColor: selecionado ? 'var(--cor-primaria-suave)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all var(--transicao-rapida)',
                }}
              >
                <span style={{ fontSize: '1.8rem' }}>{item.emoji}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.label}</span>
              </button>
            )
          })}
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
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <span className="badge badge-danger">Tipo: {f.tipo_sanguineo}</span>
                          <button type="button" onClick={() => excluirFicha(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
                        <div><strong>Alergias:</strong> {f.alergias}</div>
                        <div><strong>Medicamento Contínuo:</strong> {f.medicamentos_uso_continuo}</div>
                        <div><strong>Plano de Saúde:</strong> {f.numero_plano_saude}</div>
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
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>📋 Agendar Consulta ou Exame</h2>
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
                <label className="form-label">Título / Especialidade</label>
                <input type="text" className="input" placeholder="Ex: Pediatra, Oftalmologista" value={conTitulo} onChange={(e) => setConTitulo(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Médico ou Clínica</label>
                <input type="text" className="input" placeholder="Ex: Dr. Marcelo, Lab Sabin" value={conClinica} onChange={(e) => setConClinica(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data e Hora Agendada</label>
                <input type="datetime-local" className="input" value={conData} onChange={(e) => setConData(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data de Retorno (Opcional)</label>
                <input type="date" className="input" value={conRetorno} onChange={(e) => setConRetorno(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvandoConsulta}>
                {salvandoConsulta ? 'Agendando...' : '+ Salvar Agendamento'}
              </button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px' }}>Agenda de Consultas e Exames</h3>
            {consultas.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '24px' }}>
                Nenhum agendamento pendente.
              </div>
            ) : (
              <div className="tabela-container">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Membro</th>
                      <th>Tipo</th>
                      <th>Especialidade / Título</th>
                      <th>Médico / Clínica</th>
                      <th>Data e Hora</th>
                      <th>Retorno</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultas.map((c) => {
                      const u = usuarios.find((x) => x.id === c.usuario_id)
                      return (
                        <tr key={c.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={c.concluido}
                              onChange={() => toggleConcluidoConsulta(c)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--cor-sucesso)' }}
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{u?.nome || 'Membro'}</td>
                          <td>
                            <span className={`badge ${c.tipo === 'consulta' ? 'badge-primary' : 'badge-secondary'}`}>
                              {c.tipo === 'consulta' ? '🩺 Consulta' : '🧪 Exame'}
                            </span>
                          </td>
                          <td style={{ textDecoration: c.concluido ? 'line-through' : 'none', fontWeight: 600 }}>{c.titulo}</td>
                          <td>{c.especialista_ou_clinica || '-'}</td>
                          <td>{new Date(c.data_agendada).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td>{c.data_retorno ? new Date(c.data_retorno).toLocaleDateString('pt-BR') : '-'}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button type="button" onClick={() => excluirConsulta(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
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
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '14px' }}>Histórico de Medições Vitais</h3>
            {metricas.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '24px' }}>
                Nenhuma medição registrada ainda.
              </div>
            ) : (
              <div className="tabela-container">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Data e Hora</th>
                      <th>Membro</th>
                      <th>Tipo</th>
                      <th>Medição</th>
                      <th>Observação</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricas.map((m) => {
                      const u = usuarios.find((x) => x.id === m.usuario_id)
                      const formatado = m.tipo_metrica === 'pressao'
                        ? `${m.valor_principal} x ${m.valor_secundario} ${m.unidade}`
                        : `${m.valor_principal} ${m.unidade}`

                      return (
                        <tr key={m.id}>
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
              </div>
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

    </div>
  )
}
