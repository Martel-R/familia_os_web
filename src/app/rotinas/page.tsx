'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Tarefa {
  id: string
  titulo: string
  recorrencia: 'unica' | 'diaria' | 'semanal' | 'mensal'
  moedas_recompensa: number
  esta_concluida: boolean
}

export default function RotinasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Formulário de nova tarefa
  const [titulo, setTitulo] = useState('')
  const [recorrencia, setRecorrencia] = useState<'unica' | 'diaria' | 'semanal' | 'mensal'>('diaria')
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

  const toggleTarefa = async (tarefa: Tarefa) => {
    const novoStatus = !tarefa.esta_concluida
    // Otimista
    setTarefas(
      tarefas.map((t) => (t.id === tarefa.id ? { ...t, esta_concluida: novoStatus } : t))
    )

    const { error } = await supabase
      .from('tarefas_rotinas')
      .update({ esta_concluida: novoStatus })
      .eq('id', tarefa.id)

    if (error) {
      console.error('Erro ao atualizar tarefa:', error)
      carregarTarefas() // Reverte
    }
  }

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || salvando) return

    setSalvando(true)
    try {
      const nova = {
        titulo,
        recorrencia,
        moedas_recompensa: parseInt(moedas) || 0,
        esta_concluida: false,
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
      }
    } finally {
      setSalvando(false)
    }
  }

  const semearExemplos = async () => {
    setSalvando(true)
    try {
      const exemplos = [
        { titulo: 'Arrumar a cama e organizar a mesa de estudos', recorrencia: 'diaria', moedas_recompensa: 10, esta_concluida: true },
        { titulo: 'Levar o lixo reciclável para a lixeira externa', recorrencia: 'diaria', moedas_recompensa: 5, esta_concluida: false },
        { titulo: 'Alimentar o pet e trocar a água', recorrencia: 'diaria', moedas_recompensa: 10, esta_concluida: true },
        { titulo: 'Dever de casa concluído sem atrasos', recorrencia: 'diaria', moedas_recompensa: 15, esta_concluida: false },
      ]
      await supabase.from('tarefas_rotinas').insert(exemplos)
      await carregarTarefas()
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
            Tarefas persistidas no Supabase com pontuação de moedas interativa.
          </p>
        </div>

        {tarefas.length === 0 && !carregando && (
          <button onClick={semearExemplos} className="btn btn-secondary" disabled={salvando}>
            🌱 Carregar Tarefas de Exemplo
          </button>
        )}
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
            Calculado a partir das tarefas concluídas registradas
          </p>
        </div>
      </div>

      {/* Formulário de Nova Tarefa */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Nova Tarefa / Rotina</h2>
        <form onSubmit={handleAdicionar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Título da Tarefa</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Escovar os dentes após almoço"
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
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
              <option value="unica">Única</option>
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
        </form>
      </div>

      {/* Checklist do Dia */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Checklist de Rotinas</h2>
          {carregando && <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)' }}>Carregando...</span>}
        </div>

        {tarefas.length === 0 && !carregando ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhuma rotina cadastrada ainda no Supabase.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tarefas.map((tarefa) => (
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
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', textTransform: 'capitalize' }}>
                      Recorrência: {tarefa.recorrencia}
                    </div>
                  </div>
                </div>

                <span className="badge badge-warning">
                  🪙 +{tarefa.moedas_recompensa} Moedas
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
