'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Evento {
  id: string
  nome: string
  data_evento: string
  descricao: string
  orcamento_estimado: number
}

interface Convidado {
  id: string
  evento_id: string
  nome: string
  telefone: string
  status: 'confirmado' | 'pendente' | 'recusado'
  restricoes_alimentares?: string
}

export default function EventosPage() {
  const [eventoAtivo, setEventoAtivo] = useState<Evento | null>(null)
  const [convidados, setConvidados] = useState<Convidado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Formulário
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [restricoes, setRestricoes] = useState('')

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const { data: eventos, error: errEv } = await supabase
        .from('eventos')
        .select('*')
        .order('data_evento', { ascending: true })

      if (errEv) {
        console.error('Erro ao buscar eventos:', errEv)
      } else if (eventos && eventos.length > 0) {
        setEventoAtivo(eventos[0])

        const { data: convs, error: errConv } = await supabase
          .from('convidados')
          .select('*')
          .eq('evento_id', eventos[0].id)

        if (!errConv && convs) {
          setConvidados(convs)
        }
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleAdicionarConvidado = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim() || !eventoAtivo || salvando) return

    setSalvando(true)
    try {
      const novoConvidado = {
        evento_id: eventoAtivo.id,
        nome,
        telefone: telefone || 'Não informado',
        status: 'pendente' as const,
        restricoes_alimentares: restricoes || 'Nenhuma',
      }

      const { data, error } = await supabase
        .from('convidados')
        .insert([novoConvidado])
        .select()

      if (error) {
        alert('Erro ao adicionar convidado: ' + error.message)
      } else if (data) {
        setConvidados([...convidados, data[0]])
        setNome('')
        setTelefone('')
        setRestricoes('')
      }
    } finally {
      setSalvando(false)
    }
  }

  const semearEventoExemplo = async () => {
    setSalvando(true)
    try {
      const novoEv = {
        nome: '🎂 Aniversário do Lucas (10 Anos)',
        data_evento: '2026-11-15T18:00:00Z',
        descricao: 'Salão de Festas do Condomínio',
        orcamento_estimado: 1500.0,
      }

      const { data, error } = await supabase
        .from('eventos')
        .insert([novoEv])
        .select()

      if (error) {
        alert('Erro ao criar evento: ' + error.message)
        return
      }

      if (data && data.length > 0) {
        const evId = data[0].id
        const convs = [
          { evento_id: evId, nome: 'Tio Carlos & Família', telefone: '(91) 98111-2233', status: 'confirmado', restricoes_alimentares: 'Nenhuma' },
          { evento_id: evId, nome: 'Mariana Silva', telefone: '(91) 98444-5566', status: 'confirmado', restricoes_alimentares: 'Intolerante a Lactose' },
          { evento_id: evId, nome: 'Roberto Andrade', telefone: '(91) 99222-3344', status: 'pendente', restricoes_alimentares: 'Vegetariano' },
        ]
        await supabase.from('convidados').insert(convs)
        await carregarDados()
      }
    } finally {
      setSalvando(false)
    }
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
            Listas de convidados e orçamentos integrados diretamente ao Supabase.
          </p>
        </div>

        {!eventoAtivo && !carregando && (
          <button onClick={semearEventoExemplo} className="btn btn-secondary" disabled={salvando}>
            🌱 Criar Evento de Exemplo
          </button>
        )}
      </div>

      {/* Detalhes do Evento Ativo */}
      {eventoAtivo ? (
        <div className="card" style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span className="badge badge-primary" style={{ marginBottom: '8px' }}>Próximo Grande Evento</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{eventoAtivo.nome}</h2>
              <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
                Local: {eventoAtivo.descricao}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Orçamento Estimado</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  R$ {Number(eventoAtivo.orcamento_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
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
      ) : (
        <div className="card" style={{ marginBottom: '32px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
          {carregando ? 'Carregando dados de eventos...' : 'Nenhum evento ativo cadastrado no momento.'}
        </div>
      )}

      {/* Formulário de Adicionar Convidado */}
      {eventoAtivo && (
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

            <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvando}>
              {salvando ? 'Salvando...' : '+ Adicionar à Lista'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de Convidados (RSVP) */}
      {eventoAtivo && (
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Lista de Presença (RSVP)</h3>
          {convidados.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
              Nenhum convidado adicionado ainda.
            </div>
          ) : (
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
                        <span style={{ color: c.restricoes_alimentares !== 'Nenhuma' ? 'var(--cor-alerta)' : 'var(--texto-secundario)' }}>
                          {c.restricoes_alimentares || 'Nenhuma'}
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
          )}
        </div>
      )}

    </div>
  )
}
