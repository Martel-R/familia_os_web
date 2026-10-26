'use client'

import { useState } from 'react'

interface Tarefa {
  id: string
  titulo: string
  responsavel: string
  moedas: number
  concluida: boolean
}

const TAREFAS_INICIAIS: Tarefa[] = [
  { id: '1', titulo: 'Arrumar a cama e organizar a mesa de estudos', responsavel: 'Gabriel', moedas: 10, concluida: true },
  { id: '2', titulo: 'Levar o lixo reciclável para a lixeira externa', responsavel: 'Gabriel', moedas: 5, concluida: false },
  { id: '3', titulo: 'Alimentar o pet e trocar a água', responsavel: 'Sofia', moedas: 10, concluida: true },
  { id: '4', titulo: 'Dever de casa concluído sem atrasos', responsavel: 'Sofia', moedas: 15, concluida: false },
]

export default function RotinasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>(TAREFAS_INICIAIS)

  const toggleTarefa = (id: string) => {
    setTarefas(
      tarefas.map((t) => (t.id === id ? { ...t, concluida: !t.concluida } : t))
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Rotinas, Hábitos & Gamificação
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Acompanhe o cumprimento das tarefas diárias e a pontuação de moedas das crianças.
          </p>
        </div>
      </div>

      {/* Loja de Privilégios e Saldo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card">
          <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', fontWeight: 500 }}>
            Saldo de Moedas (Gabriel)
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '8px', color: 'var(--cor-alerta)' }}>
            🪙 85 Moedas
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>
            Pode resgatar: +1h de Videogame (50 moedas)
          </p>
        </div>

        <div className="card">
          <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', fontWeight: 500 }}>
            Saldo de Moedas (Sofia)
          </span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '8px', color: 'var(--cor-alerta)' }}>
            🪙 55 Moedas
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>
            Pode resgatar: Escolher o filme da noite (30 moedas)
          </p>
        </div>
      </div>

      {/* Lista de Rotinas Diárias */}
      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Checklist do Dia</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tarefas.map((tarefa) => (
            <div
              key={tarefa.id}
              onClick={() => toggleTarefa(tarefa.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderRadius: 'var(--raio-md)',
                backgroundColor: tarefa.concluida ? 'var(--bg-app)' : 'var(--bg-hover)',
                border: '1px solid var(--borda)',
                cursor: 'pointer',
                transition: 'all var(--transicao-rapida)',
                opacity: tarefa.concluida ? 0.7 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <input
                  type="checkbox"
                  checked={tarefa.concluida}
                  onChange={() => {}}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 500, textDecoration: tarefa.concluida ? 'line-through' : 'none' }}>
                    {tarefa.titulo}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>
                    Responsável: {tarefa.responsavel}
                  </div>
                </div>
              </div>

              <span className="badge badge-warning">
                🪙 +{tarefa.moedas} Moedas
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
