'use client'

import { useState } from 'react'

interface Transacao {
  id: string
  descricao: string
  tipo: 'receita' | 'despesa_fixa' | 'despesa_variavel' | 'assinatura'
  valor: number
  data_vencimento: string
  status: 'pendente' | 'pago' | 'atrasado'
}

const TRANSACOES_INICIAIS: Transacao[] = [
  { id: '1', descricao: 'Salário / Renda Principal', tipo: 'receita', valor: 9500.0, data_vencimento: '2026-11-05', status: 'pago' },
  { id: '2', descricao: 'Aluguel do Imóvel', tipo: 'despesa_fixa', valor: 2200.0, data_vencimento: '2026-11-10', status: 'pendente' },
  { id: '3', descricao: 'Plano de Saúde Familiar', tipo: 'despesa_fixa', valor: 980.0, data_vencimento: '2026-11-15', status: 'pendente' },
  { id: '4', descricao: 'Assinatura Netflix & Disney+', tipo: 'assinatura', valor: 89.9, data_vencimento: '2026-11-18', status: 'pago' },
]

export default function FinancasPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>(TRANSACOES_INICIAIS)
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<'receita' | 'despesa_fixa' | 'despesa_variavel' | 'assinatura'>('despesa_variavel')
  const [dataVencimento, setDataVencimento] = useState('')

  const handleAdicionar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao || !valor || !dataVencimento) return

    const nova: Transacao = {
      id: Math.random().toString(),
      descricao,
      tipo,
      valor: parseFloat(valor),
      data_vencimento: dataVencimento,
      status: 'pendente',
    }

    setTransacoes([nova, ...transacoes])
    setDescricao('')
    setValor('')
    setDataVencimento('')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Finanças & Fluxo de Caixa
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Gerenciamento consolidado de receitas, contas fixas, assinaturas e cofrinhos.
          </p>
        </div>
      </div>

      {/* Grid de Cofrinhos / Metas */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Cofrinhos & Metas da Família</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>🏖️ Férias de Verão</span>
              <span className="badge badge-primary">70%</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              R$ 7.000 <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', fontWeight: 400 }}>de R$ 10.000</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--raio-full)', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ width: '70%', height: '100%', backgroundColor: 'var(--cor-primaria)', borderRadius: 'var(--raio-full)' }} />
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>🛡️ Reserva de Emergência</span>
              <span className="badge badge-success">92%</span>
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              R$ 18.400 <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', fontWeight: 400 }}>de R$ 20.000</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--raio-full)', marginTop: '12px', overflow: 'hidden' }}>
              <div style={{ width: '92%', height: '100%', backgroundColor: 'var(--cor-sucesso)', borderRadius: 'var(--raio-full)' }} />
            </div>
          </div>

        </div>
      </div>

      {/* Formulário Rápido de Lançamento */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Novo Lançamento Financeiro</h2>
        <form onSubmit={handleAdicionar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Descrição</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Conta de Luz"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Tipo</label>
            <select
              className="input"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as any)}
            >
              <option value="despesa_variavel">Despesa Variável</option>
              <option value="despesa_fixa">Despesa Fixa</option>
              <option value="assinatura">Assinatura</option>
              <option value="receita">Receita</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Data de Vencimento</label>
            <input
              type="date"
              className="input"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>
            + Adicionar
          </button>
        </form>
      </div>

      {/* Lista de Transações */}
      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Transações e Contas</h2>
        <div className="tabela-container">
          <table className="tabela">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transacoes.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 500 }}>{t.descricao}</td>
                  <td>
                    <span style={{ textTransform: 'capitalize' }}>
                      {t.tipo.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{t.data_vencimento}</td>
                  <td style={{ fontWeight: 600, color: t.tipo === 'receita' ? 'var(--cor-sucesso)' : 'inherit' }}>
                    {t.tipo === 'receita' ? '+' : '-'} R$ {t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        t.status === 'pago'
                          ? 'badge-success'
                          : t.status === 'pendente'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {t.status.toUpperCase()}
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
