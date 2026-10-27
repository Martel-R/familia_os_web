'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [balancoLivre, setBalancoLivre] = useState(0)
  const [contasPendentes, setContasPendentes] = useState(0)
  const [pendentesCount, setPendentesCount] = useState(0)
  const [moedasTotal, setMoedasTotal] = useState(0)
  const [tarefas, setTarefas] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarDashboard() {
      try {
        setCarregando(true)

        // 1. Transações para cálculo do balanço
        const { data: transacoes } = await supabase
          .from('transacoes_financeiras')
          .select('tipo, valor, status')

        if (transacoes) {
          let receitas = 0
          let despesas = 0
          let pendentes = 0
          let countPendentes = 0

          transacoes.forEach((t) => {
            const v = Number(t.valor) || 0
            if (t.tipo === 'receita') {
              receitas += v
            } else {
              despesas += v
              if (t.status === 'pendente') {
                pendentes += v
                countPendentes++
              }
            }
          })

          setBalancoLivre(receitas - despesas)
          setContasPendentes(pendentes)
          setPendentesCount(countPendentes)
        }

        // 2. Tarefas e Moedas
        const { data: rotinas } = await supabase
          .from('tarefas_rotinas')
          .select('*')
          .order('atualizado_em', { ascending: false })
          .limit(4)

        if (rotinas) {
          setTarefas(rotinas)
          const moedas = rotinas
            .filter((r) => r.esta_concluida)
            .reduce((acc, r) => acc + (r.moedas_recompensa || 0), 0)
          setMoedasTotal(moedas)
        }

        // 3. Eventos
        const { data: evs } = await supabase
          .from('eventos')
          .select('*')
          .order('data_evento', { ascending: true })
          .limit(3)

        if (evs) {
          setEventos(evs)
        }
      } catch (err) {
        console.error('Erro ao carregar dashboard:', err)
      } finally {
        setCarregando(false)
      }
    }

    carregarDashboard()
  }, [])

  return (
    <div>
      {/* Cabeçalho do Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Visão Geral da Família
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Acompanhe o orçamento, rotinas diárias e os próximos compromissos em tempo real via Supabase.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/financas" className="btn btn-secondary">
            + Lançar Despesa
          </Link>
          <Link href="/rotinas" className="btn btn-primary">
            + Nova Tarefa
          </Link>
        </div>
      </div>

      {/* Grid de Cards Resumo */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', fontWeight: 500 }}>
              Balanço Livre da Casa
            </span>
            <span className="badge badge-success">{carregando ? '...' : 'Tempo Real'}</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: balancoLivre >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-perigo)' }}>
            R$ {balancoLivre.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '8px' }}>
            Calculado sobre todas as receitas e despesas registradas
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', fontWeight: 500 }}>
              Contas a Pagar
            </span>
            <span className="badge badge-warning">{pendentesCount} Pendentes</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            R$ {contasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '8px' }}>
            Total de despesas com status pendente
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', fontWeight: 500 }}>
              Gamificação Infantil
            </span>
            <span className="badge badge-primary">Rotinas Ativas</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {moedasTotal} <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--texto-secundario)' }}>Moedas</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '8px' }}>
            Moedas resgatáveis por tarefas concluídas
          </p>
        </div>
      </div>

      {/* Seção com Duas Colunas: Tarefas & Eventos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Tarefas e Rotinas do Dia */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Rotinas Recentes</h2>
            <Link href="/rotinas" style={{ fontSize: '0.875rem', color: 'var(--cor-primaria)', fontWeight: 500 }}>
              Ver todas
            </Link>
          </div>

          {tarefas.length === 0 ? (
            <div style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', padding: '16px 0', textAlign: 'center' }}>
              {carregando ? 'Carregando tarefas...' : 'Nenhuma tarefa cadastrada. Adicione sua primeira rotina!'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tarefas.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: 'var(--raio-md)',
                    backgroundColor: 'var(--bg-hover)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{t.titulo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', textTransform: 'capitalize' }}>
                      Recorrência: {t.recorrencia} • +{t.moedas_recompensa} Moedas
                    </div>
                  </div>
                  <span className={`badge ${t.esta_concluida ? 'badge-success' : 'badge-warning'}`}>
                    {t.esta_concluida ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximos Eventos & Compromissos */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Próximos Eventos</h2>
            <Link href="/eventos" style={{ fontSize: '0.875rem', color: 'var(--cor-primaria)', fontWeight: 500 }}>
              Ver todos
            </Link>
          </div>

          {eventos.length === 0 ? (
            <div style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', padding: '16px 0', textAlign: 'center' }}>
              {carregando ? 'Carregando eventos...' : 'Nenhum evento agendado.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {eventos.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: 'var(--raio-md)',
                    backgroundColor: 'var(--bg-hover)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{ev.nome}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>
                      Local: {ev.descricao || 'A definir'}
                    </div>
                  </div>
                  <span className="badge badge-primary">
                    R$ {Number(ev.orcamento_estimado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
