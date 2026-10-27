'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Transacao {
  id: string
  descricao: string
  tipo: 'receita' | 'despesa_fixa' | 'despesa_variavel' | 'assinatura'
  valor: number
  data_vencimento: string
  status: 'pendente' | 'pago' | 'atrasado'
}

interface Cofrinho {
  id: string
  nome: string
  meta_valor: number
  saldo_atual: number
  icone?: string
}

export default function FinancasPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [cofrinhos, setCofrinhos] = useState<Cofrinho[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Campos do formulário
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<'receita' | 'despesa_fixa' | 'despesa_variavel' | 'assinatura'>('despesa_variavel')
  const [dataVencimento, setDataVencimento] = useState('')

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const { data: transacoesData, error: errTrans } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .order('criado_em', { ascending: false })

      if (errTrans) {
        console.error('Erro ao buscar transações:', errTrans)
      } else if (transacoesData) {
        setTransacoes(transacoesData)
      }

      const { data: cofrinhosData, error: errCofre } = await supabase
        .from('cofrinhos')
        .select('*')

      if (errCofre) {
        console.error('Erro ao buscar cofrinhos:', errCofre)
      } else if (cofrinhosData) {
        setCofrinhos(cofrinhosData)
      }
    } catch (err) {
      console.error('Falha geral ao carregar dados:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao || !valor || !dataVencimento || salvando) return

    setSalvando(true)
    try {
      const novaTransacao = {
        descricao,
        tipo,
        valor: parseFloat(valor),
        data_vencimento: dataVencimento,
        status: 'pendente',
      }

      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .insert([novaTransacao])
        .select()

      if (error) {
        alert('Erro ao salvar no Supabase: ' + error.message)
      } else if (data) {
        setTransacoes([data[0], ...transacoes])
        setDescricao('')
        setValor('')
        setDataVencimento('')
      }
    } catch (err: any) {
      alert('Erro inesperado: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  const semearExemplos = async () => {
    setSalvando(true)
    try {
      const exemplos = [
        { descricao: 'Salário Principal', tipo: 'receita', valor: 9500.0, data_vencimento: '2026-11-05', status: 'pago' },
        { descricao: 'Aluguel do Imóvel', tipo: 'despesa_fixa', valor: 2200.0, data_vencimento: '2026-11-10', status: 'pendente' },
        { descricao: 'Plano de Saúde Familiar', tipo: 'despesa_fixa', valor: 980.0, data_vencimento: '2026-11-15', status: 'pendente' },
        { descricao: 'Netflix & Streaming', tipo: 'assinatura', valor: 89.9, data_vencimento: '2026-11-18', status: 'pago' },
      ]
      await supabase.from('transacoes_financeiras').insert(exemplos)

      const cofrinhosExemplo = [
        { nome: '🏖️ Férias de Verão', meta_valor: 10000.0, saldo_atual: 7000.0, icone: '🏖️' },
        { nome: '🛡️ Reserva de Emergência', meta_valor: 20000.0, saldo_atual: 18400.0, icone: '🛡️' },
      ]
      await supabase.from('cofrinhos').insert(cofrinhosExemplo)

      await carregarDados()
    } catch (err: any) {
      alert('Erro ao inicializar dados: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Finanças & Fluxo de Caixa
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Dados sincronizados em tempo real com o Supabase (schema <code>familialm</code>).
          </p>
        </div>

        {transacoes.length === 0 && !carregando && (
          <button onClick={semearExemplos} className="btn btn-secondary" disabled={salvando}>
            🌱 Inicializar Dados de Exemplo
          </button>
        )}
      </div>

      {/* Grid de Cofrinhos / Metas */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Cofrinhos & Metas da Família</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
          {cofrinhos.length === 0 ? (
            <div className="card" style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem' }}>
              Nenhum cofrinho cadastrado no momento.
            </div>
          ) : (
            cofrinhos.map((cofre) => {
              const porcentagem = Math.min(Math.round((cofre.saldo_atual / cofre.meta_valor) * 100), 100)
              return (
                <div key={cofre.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>{cofre.nome}</span>
                    <span className="badge badge-primary">{porcentagem}%</span>
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    R$ {cofre.saldo_atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                    <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)', fontWeight: 400 }}>
                      de R$ {cofre.meta_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--raio-full)', marginTop: '12px', overflow: 'hidden' }}>
                    <div style={{ width: `${porcentagem}%`, height: '100%', backgroundColor: 'var(--cor-primaria)', borderRadius: 'var(--raio-full)' }} />
                  </div>
                </div>
              )
            })
          )}
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

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvando}>
            {salvando ? 'Salvando...' : '+ Lançar no Supabase'}
          </button>
        </form>
      </div>

      {/* Lista de Transações */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Transações e Contas</h2>
          {carregando && <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)' }}>Atualizando...</span>}
        </div>

        {transacoes.length === 0 && !carregando ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhuma transação financeira registrada no banco ainda.
          </div>
        ) : (
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
                      {t.tipo === 'receita' ? '+' : '-'} R$ {Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
        )}
      </div>

    </div>
  )
}
