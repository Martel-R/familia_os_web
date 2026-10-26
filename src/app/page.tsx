import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div>
      {/* Cabeçalho do Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Visão Geral da Família
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Acompanhe o orçamento, rotinas diárias e os próximos compromissos em tempo real.
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
            <span className="badge badge-success">Atualizado</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--cor-sucesso)' }}>
            R$ 4.250,00
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '8px' }}>
            Disponível após despesas fixas e cofrinhos
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', fontWeight: 500 }}>
              Contas a Pagar (Mês)
            </span>
            <span className="badge badge-warning">2 Pendentes</span>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            R$ 1.830,50
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '8px' }}>
            Próximo vencimento em 3 dias (Internet)
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
            140 <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--texto-secundario)' }}>Moedas</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '8px' }}>
            85% das tarefas de hoje foram concluídas
          </p>
        </div>
      </div>

      {/* Seção com Duas Colunas: Tarefas & Eventos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        
        {/* Tarefas e Rotinas do Dia */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Rotinas de Hoje</h2>
            <Link href="/rotinas" style={{ fontSize: '0.875rem', color: 'var(--cor-primaria)', fontWeight: 500 }}>
              Ver todas
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
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
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Arrumar o quarto e cama</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Responsável: Gabriel • +10 Moedas</div>
              </div>
              <span className="badge badge-success">Concluído</span>
            </div>

            <div
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
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Levar o lixo reciclável</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Responsável: Gabriel • +5 Moedas</div>
              </div>
              <span className="badge badge-warning">Pendente</span>
            </div>

            <div
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
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Regar as plantas do jardim</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Responsável: Família • +5 Moedas</div>
              </div>
              <span className="badge badge-warning">Pendente</span>
            </div>
          </div>
        </div>

        {/* Próximos Eventos & Compromissos */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Próximos Eventos</h2>
            <Link href="/eventos" style={{ fontSize: '0.875rem', color: 'var(--cor-primaria)', fontWeight: 500 }}>
              Ver todos
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
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
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Aniversário do Lucas</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>15 de Novembro • 18 Convidados</div>
              </div>
              <span className="badge badge-primary">Orçamento R$ 1.500</span>
            </div>

            <div
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
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>Manutenção Preventiva do Ar Condicionado</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>22 de Novembro • Técnico Confirmado</div>
              </div>
              <span className="badge badge-warning">Agendado</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
