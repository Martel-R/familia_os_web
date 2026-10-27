'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Tarefa {
  id: string
  titulo: string
  recorrencia: 'unica' | 'diaria' | 'semanal' | 'mensal'
  dias_semana?: string
  dia_mes?: number
  moedas_recompensa: number
  esta_concluida: boolean
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
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Formulário de nova tarefa
  const [titulo, setTitulo] = useState('')
  const [recorrencia, setRecorrencia] = useState<'unica' | 'diaria' | 'semanal' | 'mensal'>('diaria')
  const [diasSelecionados, setDiasSelecionados] = useState<string[]>([])
  const [diaMes, setDiaMes] = useState<number>(1)
  const [moedas, setMoedas] = useState('10')

  const carregarTarefas = async () => {
    try {
      setCarregando(true)
      const { data, error } = await supabase
        .from('tarefas_rotinas')
        .select('*')
        .order('atualizado_em', { ascending: false })

      if (error) {
        console.error('Erro ao carregar rotinas:', error)
      } else if (data) {
        setTarefas(data)
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarTarefas()
  }, [])

  const toggleDiaSemana = (dia: string) => {
    if (diasSelecionados.includes(dia)) {
      setDiasSelecionados(diasSelecionados.filter((d) => d !== dia))
    } else {
      setDiasSelecionados([...diasSelecionados, dia])
    }
  }

  const toggleTarefa = async (tarefa: Tarefa) => {
    const novoStatus = !tarefa.esta_concluida
    setTarefas(
      tarefas.map((t) => (t.id === tarefa.id ? { ...t, esta_concluida: novoStatus } : t))
    )

    const { error } = await supabase
      .from('tarefas_rotinas')
      .update({ esta_concluida: novoStatus })
      .eq('id', tarefa.id)

    if (error) {
      console.error('Erro ao atualizar tarefa:', error)
      carregarTarefas()
    }
  }

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || salvando) return

    setSalvando(true)
    try {
      const nova: any = {
        titulo,
        recorrencia,
        moedas_recompensa: parseInt(moedas) || 0,
        esta_concluida: false,
      }

      if (recorrencia === 'semanal') {
        nova.dias_semana = diasSelecionados.join(', ') || 'Segunda a Sexta'
      } else if (recorrencia === 'mensal') {
        nova.dia_mes = Number(diaMes) || 1
      }

      const { data, error } = await supabase
        .from('tarefas_rotinas')
        .insert([nova])
        .select()

      if (error) {
        alert('Erro ao cadastrar tarefa: ' + error.message)
      } else if (data) {
        setTarefas([data[0], ...tarefas])
        setTitulo('')
        setMoedas('10')
        setDiasSelecionados([])
        setDiaMes(1)
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Rotinas, Hábitos & Gamificação
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Tarefas persistidas no Supabase com suporte a dias da semana e dias do mês.
          </p>
        </div>
      </div>

      {/* Saldo de Moedas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card">
          <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', fontWeight: 500 }}>
            Moedas Acumuladas
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '8px', color: 'var(--cor-alerta)' }}>
            🪙 {tarefas.filter(t => t.esta_concluida).reduce((acc, t) => acc + (t.moedas_recompensa || 0), 0)} Moedas
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>
            Calculado sobre tarefas concluídas registradas no banco
          </p>
        </div>
      </div>

      {/* Formulário de Nova Tarefa */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Nova Tarefa / Rotina</h2>
        <form onSubmit={handleAdicionar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Título da Tarefa</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Levar o lixo reciclável"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
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
                <option value="unica">Única (Uma só vez)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Moedas de Recompensa</label>
              <input
                type="number"
                className="input"
                value={moedas}
                onChange={(e) => setMoedas(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvando}>
              {salvando ? 'Salvando...' : '+ Cadastrar Tarefa'}
            </button>
          </div>

          {/* Seletor Dinâmico de Dias da Semana (caso semanal) */}
          {recorrencia === 'semanal' && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Selecione os dias da semana para esta rotina:
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DIAS_DA_SEMANA.map((dia) => {
                  const selecionado = diasSelecionados.includes(dia.id)
                  return (
                    <button
                      key={dia.id}
                      type="button"
                      onClick={() => toggleDiaSemana(dia.id)}
                      className="btn"
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.8rem',
                        backgroundColor: selecionado ? 'var(--cor-primaria)' : 'var(--bg-card)',
                        color: selecionado ? '#ffffff' : 'var(--texto-principal)',
                        border: '1px solid var(--borda)',
                      }}
                    >
                      {dia.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Seletor Dinâmico de Dia do Mês (caso mensal) */}
          {recorrencia === 'mensal' && (
            <div style={{ padding: '12px 16px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                Dia fixo do mês para repetição (1 a 31):
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.875rem' }}>Todo dia</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="input"
                  style={{ width: '100px' }}
                  value={diaMes}
                  onChange={(e) => setDiaMes(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                />
                <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)' }}>de cada mês</span>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Checklist do Dia */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Rotinas Cadastradas</h2>
          {carregando && <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)' }}>Carregando...</span>}
        </div>

        {tarefas.length === 0 && !carregando ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhuma rotina cadastrada ainda no Supabase.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tarefas.map((tarefa) => {
              let detalheRecorrencia = tarefa.recorrencia as string
              if (tarefa.recorrencia === 'semanal' && tarefa.dias_semana) {
                detalheRecorrencia = `Semanal: ${tarefa.dias_semana}`
              } else if (tarefa.recorrencia === 'mensal' && tarefa.dia_mes) {
                detalheRecorrencia = `Mensal: Todo dia ${tarefa.dia_mes}`
              } else if (tarefa.recorrencia === 'diaria') {
                detalheRecorrencia = 'Diária (Todos os dias)'
              }

              return (
                <div
                  key={tarefa.id}
                  onClick={() => toggleTarefa(tarefa)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    borderRadius: 'var(--raio-md)',
                    backgroundColor: tarefa.esta_concluida ? 'var(--bg-app)' : 'var(--bg-hover)',
                    border: '1px solid var(--borda)',
                    cursor: 'pointer',
                    transition: 'all var(--transicao-rapida)',
                    opacity: tarefa.esta_concluida ? 0.65 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <input
                      type="checkbox"
                      checked={tarefa.esta_concluida}
                      onChange={() => {}}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: 500, textDecoration: tarefa.esta_concluida ? 'line-through' : 'none' }}>
                        {tarefa.titulo}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                        📅 {detalheRecorrencia}
                      </div>
                    </div>
                  </div>

                  <span className="badge badge-warning">
                    🪙 +{tarefa.moedas_recompensa} Moedas
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
