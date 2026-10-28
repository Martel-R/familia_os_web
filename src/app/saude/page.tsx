'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'

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

export default function SaudePage() {
  const [humorSelecionado, setHumorSelecionado] = useState<number | null>(null)
  const [salvandoHumor, setSalvandoHumor] = useState(false)
  const [fichas, setFichas] = useState<FichaMedica[]>([])
  const [medicamentosLista, setMedicamentosLista] = useState<Medicamento[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [usuarioLogadoId, setUsuarioLogadoId] = useState<string>('')
  const [carregando, setCarregando] = useState(true)

  // Formulário de nova ficha médica
  const [fichaUsuarioId, setFichaUsuarioId] = useState('')
  const [tipoSanguineo, setTipoSanguineo] = useState('O+')
  const [alergias, setAlergias] = useState('')
  const [medicamentosContinuos, setMedicamentosContinuos] = useState('')
  const [planoSaude, setPlanoSaude] = useState('')
  const [salvandoFicha, setSalvandoFicha] = useState(false)

  // Formulário de Lembrete de Medicamento
  const [medUsuarioId, setMedUsuarioId] = useState('')
  const [medNome, setMedNome] = useState('')
  const [medDosagem, setMedDosagem] = useState('')
  const [medHorario, setMedHorario] = useState('08:00')
  const [salvandoMed, setSalvandoMed] = useState(false)

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
          setFichaUsuarioId(usuariosData[0].id)
          setMedUsuarioId(usuariosData[0].id)
        }

        const { data: authData } = await supabase.auth.getUser()
        if (authData?.user) {
          const achou = usuariosData.find((u) => u.id === authData.user.id)
          if (achou) {
            setUsuarioLogadoId(achou.id)
            setFichaUsuarioId(achou.id)
            setMedUsuarioId(achou.id)
          }
        }
      }

      const { data: fichasData } = await supabase.from('saude_fichas_medicas').select('*')
      if (fichasData) setFichas(fichasData)

      const { data: medsData } = await supabase.from('saude_medicamentos').select('*').order('horario')
      if (medsData) setMedicamentosLista(medsData)

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

  const handleSalvarFicha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fichaUsuarioId || salvandoFicha) return
    setSalvandoFicha(true)
    try {
      const nova = {
        usuario_id: fichaUsuarioId,
        tipo_sanguineo: tipoSanguineo,
        alergias: alergias || 'Nenhuma',
        medicamentos_uso_continuo: medicamentosContinuos || 'Nenhum',
        numero_plano_saude: planoSaude || 'Não informado',
      }
      const { error } = await supabase.from('saude_fichas_medicas').insert([nova])
      if (error) throw error
      await carregarDados()
      setAlergias('')
      setMedicamentosContinuos('')
      setPlanoSaude('')
    } catch (err: any) {
      alert('Erro ao salvar ficha médica: ' + err.message)
    } finally {
      setSalvandoFicha(false)
    }
  }

  const handleSalvarMedicamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!medUsuarioId || !medNome || salvandoMed) return
    setSalvandoMed(true)
    try {
      const novo = {
        usuario_id: medUsuarioId,
        nome_remedio: medNome,
        dosagem: medDosagem,
        horario: medHorario,
        foi_tomado_hoje: false
      }
      const { error } = await supabase.from('saude_medicamentos').insert([novo])
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
      setMedicamentosLista((prev) => prev.map((m) => m.id === medId ? { ...m, foi_tomado_hoje: !atualTomado } : m))
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
      setMedicamentosLista((prev) => prev.filter(m => m.id !== medId))
    } catch (err) {
      console.error(err)
    }
  }
  
  const excluirFicha = async (id: string) => {
    if (!confirm('Deseja excluir esta ficha médica?')) return
    try {
      await supabase.from('saude_fichas_medicas').delete().eq('id', id)
      setFichas((prev) => prev.filter(f => f.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Saúde Integral & Bem-Estar
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Check-in diário de humor, controle de medicamentos e fichas de emergência.
          </p>
        </div>
      </div>

      {/* Check-in Diário de Humor */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px' }}>Como você está se sentindo hoje?</h2>
        <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginBottom: '20px' }}>
          {salvandoHumor ? 'Registrando seu humor no banco...' : 'Clique em um emoji para salvar o registro do dia no Supabase.'}
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
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
                  gap: '8px',
                  padding: '16px 20px',
                  borderRadius: 'var(--raio-lg)',
                  border: selecionado ? '2px solid var(--cor-primaria)' : '1px solid var(--borda)',
                  backgroundColor: selecionado ? 'var(--cor-primaria-suave)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  transition: 'all var(--transicao-rapida)',
                }}
              >
                <span style={{ fontSize: '2rem' }}>{item.emoji}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', marginBottom: '32px' }}>
        {/* Controle de Medicamentos */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>💊 Lembretes de Medicamentos</h2>
          
          <form onSubmit={handleSalvarMedicamento} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
              <label className="form-label">Membro</label>
              <select className="input" value={medUsuarioId} onChange={e => setMedUsuarioId(e.target.value)}>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
              <label className="form-label">Remédio</label>
              <input type="text" className="input" placeholder="Ex: Ritalina" value={medNome} onChange={e => setMedNome(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '100px' }}>
              <label className="form-label">Dosagem</label>
              <input type="text" className="input" placeholder="10mg" value={medDosagem} onChange={e => setMedDosagem(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '100px' }}>
              <label className="form-label">Horário</label>
              <input type="time" className="input" value={medHorario} onChange={e => setMedHorario(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvandoMed}>
              {salvandoMed ? 'Salvando...' : '+ Adicionar'}
            </button>
          </form>

          {medicamentosLista.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '20px' }}>Nenhum medicamento registrado.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {medicamentosLista.map(med => {
                const u = usuarios.find(x => x.id === med.usuario_id)
                return (
                  <div key={med.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: 'var(--raio-md)', backgroundColor: med.foi_tomado_hoje ? 'var(--cor-sucesso-suave)' : 'var(--bg-hover)', border: `1px solid ${med.foi_tomado_hoje ? 'var(--cor-sucesso)' : 'var(--borda)'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="checkbox" checked={med.foi_tomado_hoje} onChange={() => alternarMedicamentoTomado(med.id, med.foi_tomado_hoje)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--cor-sucesso)' }} />
                      <div>
                        <div style={{ fontWeight: 600, textDecoration: med.foi_tomado_hoje ? 'line-through' : 'none' }}>{med.nome_remedio} ({med.dosagem})</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)' }}>{u?.nome} • ⏰ {med.horario}</div>
                      </div>
                    </div>
                    <button type="button" onClick={() => excluirMedicamento(med.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Formulário de Nova Ficha Médica */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Cadastrar Ficha Médica de Emergência</h2>
          <form onSubmit={handleSalvarFicha} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Membro</label>
              <select className="input" value={fichaUsuarioId} onChange={e => setFichaUsuarioId(e.target.value)}>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
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
              <label className="form-label">Medicamentos Contínuos</label>
              <input type="text" className="input" placeholder="Ex: Insulina, Pressão" value={medicamentosContinuos} onChange={(e) => setMedicamentosContinuos(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nº do Plano de Saúde</label>
              <input type="text" className="input" placeholder="Ex: Unimed 123456" value={planoSaude} onChange={(e) => setPlanoSaude(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvandoFicha}>
              {salvandoFicha ? 'Salvando...' : '+ Salvar'}
            </button>
          </form>
        </div>
      </div>

      {/* Fichas Médicas Cadastradas */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Fichas Registradas</h2>
        {fichas.length === 0 && !carregando ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhuma ficha médica cadastrada ainda.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {fichas.map((f) => {
              const u = usuarios.find(x => x.id === f.usuario_id)
              return (
                <div key={f.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{u?.nome || 'Desconhecido'}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className="badge badge-danger">Tipo: {f.tipo_sanguineo}</span>
                      <button type="button" onClick={() => excluirFicha(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
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
  )
}
