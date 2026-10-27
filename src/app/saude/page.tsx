'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface FichaMedica {
  id: string
  tipo_sanguineo?: string
  alergias?: string
  medicamentos_uso_continuo?: string
  numero_plano_saude?: string
}

export default function SaudePage() {
  const [humorSelecionado, setHumorSelecionado] = useState<number | null>(null)
  const [salvandoHumor, setSalvandoHumor] = useState(false)
  const [fichas, setFichas] = useState<FichaMedica[]>([])
  const [carregando, setCarregando] = useState(true)

  // Formulário de nova ficha médica
  const [tipoSanguineo, setTipoSanguineo] = useState('O+')
  const [alergias, setAlergias] = useState('')
  const [medicamentos, setMedicamentos] = useState('')
  const [planoSaude, setPlanoSaude] = useState('')
  const [salvandoFicha, setSalvandoFicha] = useState(false)

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
      const { data: fichasData } = await supabase
        .from('saude_fichas_medicas')
        .select('*')

      if (fichasData) setFichas(fichasData)

      // Carregar último check-in de hoje
      const { data: checkins } = await supabase
        .from('saude_checkins')
        .select('nivel_humor')
        .order('criado_em', { ascending: false })
        .limit(1)

      if (checkins && checkins.length > 0) {
        setHumorSelecionado(checkins[0].nivel_humor)
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const registrarHumor = async (nivel: number) => {
    setHumorSelecionado(nivel)
    setSalvandoHumor(true)
    try {
      await supabase.from('saude_checkins').insert([{ nivel_humor: nivel }])
    } finally {
      setSalvandoHumor(false)
    }
  }

  const handleSalvarFicha = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoFicha(true)
    try {
      const nova = {
        tipo_sanguineo: tipoSanguineo,
        alergias: alergias || 'Nenhuma',
        medicamentos_uso_continuo: medicamentos || 'Nenhum',
        numero_plano_saude: planoSaude || 'Não informado',
      }

      const { data, error } = await supabase
        .from('saude_fichas_medicas')
        .insert([nova])
        .select()

      if (error) {
        alert('Erro ao salvar ficha médica: ' + error.message)
      } else if (data) {
        setFichas([...fichas, data[0]])
        setAlergias('')
        setMedicamentos('')
        setPlanoSaude('')
      }
    } finally {
      setSalvandoFicha(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Saúde Integral & Bem-Estar
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Check-in diário de humor e fichas médicas de emergência registradas no Supabase.
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

      {/* Formulário de Nova Ficha Médica */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Cadastrar Ficha Médica de Emergência</h2>
        <form onSubmit={handleSalvarFicha} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo Sanguíneo</label>
            <select
              className="input"
              value={tipoSanguineo}
              onChange={(e) => setTipoSanguineo(e.target.value)}
            >
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Alergias Conhecidas</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Penicilina, Amendoim"
              value={alergias}
              onChange={(e) => setAlergias(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Medicamentos Contínuos</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Insulina, Pressão"
              value={medicamentos}
              onChange={(e) => setMedicamentos(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nº do Plano de Saúde</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Unimed 123456"
              value={planoSaude}
              onChange={(e) => setPlanoSaude(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvandoFicha}>
            {salvandoFicha ? 'Salvando...' : '+ Salvar Ficha Médica'}
          </button>
        </form>
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
            {fichas.map((f) => (
              <div key={f.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Membro da Família</span>
                  <span className="badge badge-danger">Tipo: {f.tipo_sanguineo}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
                  <div><strong>Alergias:</strong> {f.alergias}</div>
                  <div><strong>Medicamento Contínuo:</strong> {f.medicamentos_uso_continuo}</div>
                  <div><strong>Plano de Saúde:</strong> {f.numero_plano_saude}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
