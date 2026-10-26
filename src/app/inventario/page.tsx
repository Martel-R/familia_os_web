'use client'

import { useState } from 'react'

interface ItemInventario {
  id: string
  nome: string
  localizacao: string
  quantidade: number
  garantiaAte: string
}

interface ContatoProfissional {
  id: string
  nome: string
  especialidade: string
  telefone: string
  emergencia: boolean
}

const ITENS_INICIAIS: ItemInventario[] = [
  { id: '1', nome: 'Smart TV 65" 4K', localizacao: 'Sala de Estar', quantidade: 1, garantiaAte: '2027-04-10' },
  { id: '2', nome: 'Geladeira Inverter Side by Side', localizacao: 'Cozinha', quantidade: 1, garantiaAte: '2028-11-20' },
  { id: '3', nome: 'Caixa de Ferramentas / Furadeira Bosch', localizacao: 'Garagem / Depósito', quantidade: 1, garantiaAte: 'Expirada' },
  { id: '4', nome: 'Filtro e Refil de Água', localizacao: 'Cozinha', quantidade: 2, garantiaAte: '2027-01-15' },
]

const CONTATOS_INICIAIS: ContatoProfissional[] = [
  { id: '1', nome: 'Seu Raimundo (Encanador)', especialidade: 'Encanamento & Vazamentos', telefone: '(91) 98765-4321', emergencia: true },
  { id: '2', nome: 'Marcos Eletricista', especialidade: 'Instalações & Quadro Elétrico', telefone: '(91) 98123-4567', emergencia: true },
  { id: '3', nome: 'Técnico de Ar Condicionado (ClimaTech)', especialidade: 'Limpeza & Gás', telefone: '(91) 99345-6789', emergencia: false },
]

export default function InventarioPage() {
  const [itens] = useState<ItemInventario[]>(ITENS_INICIAIS)
  const [contatos] = useState<ContatoProfissional[]>(CONTATOS_INICIAIS)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Inventário & Manutenção da Casa
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Localização física de equipamentos, controle de garantias e agenda de prestadores confiáveis.
          </p>
        </div>
      </div>

      {/* Tabela de Itens de Inventário */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Bens & Equipamentos Mapeados</h2>
        <div className="tabela-container">
          <table className="tabela">
            <thead>
              <tr>
                <th>Item</th>
                <th>Localização</th>
                <th>Qtd.</th>
                <th>Término da Garantia</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.nome}</td>
                  <td>{item.localizacao}</td>
                  <td>{item.quantidade}</td>
                  <td>
                    <span
                      className={`badge ${
                        item.garantiaAte === 'Expirada' ? 'badge-danger' : 'badge-success'
                      }`}
                    >
                      {item.garantiaAte}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contatos de Prestadores & Emergência */}
      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Agenda de Prestadores de Serviço</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {contatos.map((contato) => (
            <div
              key={contato.id}
              style={{
                padding: '16px',
                borderRadius: 'var(--raio-md)',
                border: '1px solid var(--borda)',
                backgroundColor: 'var(--bg-hover)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{contato.nome}</span>
                {contato.emergencia && <span className="badge badge-danger">SOS</span>}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>
                {contato.especialidade}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '12px', color: 'var(--cor-primaria)' }}>
                📞 {contato.telefone}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
