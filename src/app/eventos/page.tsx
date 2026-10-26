'use client'

import { useState } from 'react'

interface Convidado {
  id: string
  nome: string
  telefone: string
  status: 'confirmado' | 'pendente' | 'recusado'
  restricoes: string
}

const CONVIDADOS_INICIAIS: Convidado[] = [
  { id: '1', nome: 'Tio Carlos & Família', telefone: '(91) 98111-2233', status: 'confirmado', restricoes: 'Nenhuma' },
  { id: '2', nome: 'Mariana Silva', telefone: '(91) 98444-5566', status: 'confirmado', restricoes: 'Intolerante a Lactose' },
  { id: '3', nome: 'Roberto Andrade', telefone: '(91) 99222-3344', status: 'pendente', restricoes: 'Vegetariano' },
  { id: '4', nome: 'Juliana Castro', telefone: '(91) 98877-6655', status: 'recusado', restricoes: 'Nenhuma' },
]

export default function EventosPage() {
  const [convidados, setConvidados] = useState<Convidado[]>(CONVIDADOS_INICIAIS)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [restricoes, setRestricoes] = useState('')

  const handleAdicionarConvidado = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome) return

    const novo: Convidado = {
      id: Math.random().toString(),
      nome,
      telefone: telefone || 'Não informado',
      status: 'pendente',
      restricoes: restricoes || 'Nenhuma',
    }

    setConvidados([...convidados, novo])
    setNome('')
    setTelefone('')
    setRestricoes('')
  }

  const confirmadosCount = convidados.filter((c) => c.status === 'confirmado').length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Planejamento de Eventos & RSVP
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Organize listas de convidados, restrições alimentares e orçamentos de festas da família.
          </p>
        </div>
      </div>

      {/* Detalhes do Evento Ativo */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="badge badge-primary" style={{ marginBottom: '8px' }}>Próximo Grande Evento</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>🎂 Aniversário do Lucas (10 Anos)</h2>
            <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
              Data: 15 de Novembro de 2026 • Local: Salão de Festas do Condomínio
            </p>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Orçamento Estimado</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>R$ 1.500,00</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Presenças Confirmadas</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cor-sucesso)' }}>
                {confirmadosCount} / {convidados.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de Adicionar Convidado */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Convidar Novo Amigo ou Familiar</h3>
        <form onSubmit={handleAdicionarConvidado} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome Completo</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Tio Paulo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">WhatsApp / Telefone</label>
            <input
              type="text"
              className="input"
              placeholder="(91) 9...."
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Restrições Alimentares</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Sem glúten, vegetariano..."
              value={restricoes}
              onChange={(e) => setRestricoes(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
            + Adicionar à Lista
          </button>
        </form>
      </div>

      {/* Lista de Convidados (RSVP) */}
      <div className="card">
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Lista de Presença (RSVP)</h3>
        <div className="tabela-container">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Telefone</th>
                <th>Restrições Alimentares</th>
                <th>Status RSVP</th>
              </tr>
            </thead>
            <tbody>
              {convidados.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.nome}</td>
                  <td>{c.telefone}</td>
                  <td>
                    <span style={{ color: c.restricoes !== 'Nenhuma' ? 'var(--cor-alerta)' : 'var(--texto-secundario)' }}>
                      {c.restricoes}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        c.status === 'confirmado'
                          ? 'badge-success'
                          : c.status === 'pendente'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
