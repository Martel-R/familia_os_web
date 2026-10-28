'use client'

import { useState } from 'react'

export default function AutomacaoPage() {
  const [dispositivos, setDispositivos] = useState([
    { id: 'luz_sala', nome: 'Luz da Sala', comodo: 'Sala de Estar', estaLigado: false, valorStatus: 'Desligado' },
    { id: 'ar_quarto', nome: 'Ar Condicionado', comodo: 'Quarto Master', estaLigado: true, valorStatus: '23°C - Resfriando' },
    { id: 'camera_frente', nome: 'Câmera Fachada', comodo: 'Garagem', estaLigado: true, valorStatus: 'Gravando (NVR)' },
  ])

  const toggleDispositivo = (id: string) => {
    setDispositivos(prev => prev.map(d => {
      if (d.id === id) {
        const novoLigado = !d.estaLigado
        return {
          ...d,
          estaLigado: novoLigado,
          valorStatus: novoLigado ? (d.id.startsWith('ar_') ? '22°C - Resfriando' : 'Ligado') : 'Desligado'
        }
      }
      return d
    }))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Automação & Segurança (IoT)
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Integração local via Frigate NVR e Home Assistant.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {dispositivos.map(d => (
          <div key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: d.estaLigado ? '4px solid var(--cor-sucesso)' : '4px solid var(--texto-secundario)' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{d.nome}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>{d.comodo}</p>
              <div style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 600, color: d.estaLigado ? 'var(--cor-sucesso)' : 'var(--texto-secundario)' }}>
                {d.valorStatus}
              </div>
            </div>
            
            <button 
              type="button" 
              onClick={() => toggleDispositivo(d.id)}
              className={`btn ${d.estaLigado ? 'btn-danger' : 'btn-primary'}`}
            >
              {d.estaLigado ? 'Desligar' : 'Ligar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
