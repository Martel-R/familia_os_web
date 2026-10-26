'use client'

import { useState } from 'react'

export default function SaudePage() {
  const [humorSelecionado, setHumorSelecionado] = useState<number | null>(4)

  const emojisHumor = [
    { nivel: 1, label: 'Muito Mal', emoji: '😢' },
    { nivel: 2, label: 'Para Baixo', emoji: '😕' },
    { nivel: 3, label: 'Neutro', emoji: '😐' },
    { nivel: 4, label: 'Bem', emoji: '🙂' },
    { nivel: 5, label: 'Excelente', emoji: '😄' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Saúde Integral & Bem-Estar
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Fichas médicas de emergência, histórico de vacinas e monitoramento diário do humor.
          </p>
        </div>
      </div>

      {/* Check-in Diário de Humor */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px' }}>Como você está se sentindo hoje?</h2>
        <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginBottom: '20px' }}>
          O registro diário ajuda a mapear o bem-estar emocional de toda a família ao longo do mês.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {emojisHumor.map((item) => {
            const selecionado = humorSelecionado === item.nivel
            return (
              <button
                key={item.nivel}
                type="button"
                onClick={() => setHumorSelecionado(item.nivel)}
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

      {/* Fichas Médicas de Emergência da Família */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Fichas Médicas de Emergência</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Gabriel (Filho)</span>
              <span className="badge badge-danger">Tipo: O+</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
              <div><strong>Alergias:</strong> Penicilina, Amendoim</div>
              <div><strong>Medicamento Contínuo:</strong> Nenhum</div>
              <div><strong>Plano de Saúde:</strong> Unimed #84729103</div>
              <div><strong>Pediatra:</strong> Dra. Juliana Castro ((91) 9988-7766)</div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>Sofia (Filha)</span>
              <span className="badge badge-danger">Tipo: A+</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem' }}>
              <div><strong>Alergias:</strong> Nenhuma conhecida</div>
              <div><strong>Medicamento Contínuo:</strong> Antialérgico sazonal</div>
              <div><strong>Plano de Saúde:</strong> Unimed #84729104</div>
              <div><strong>Pediatra:</strong> Dra. Juliana Castro ((91) 9988-7766)</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
