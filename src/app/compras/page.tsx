'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Recibo {
  id: string
  fornecedor?: string
  data_compra?: string
  valor_total: number
}

interface ItemCompra {
  id: string
  recibo_id: string
  nome_produto: string
  quantidade: number
  valor_unitario: number
  categoria_sugerida?: string
}

export default function ComprasPage() {
  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [simulando, setSimulando] = useState(false)

  // Campos manuais
  const [fornecedor, setFornecedor] = useState('')
  const [valorTotal, setValorTotal] = useState('')

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const { data } = await supabase.from('compras_recibos').select('*').order('criado_em', { ascending: false })
      if (data) setRecibos(data)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleSimularOCR = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fornecedor || !valorTotal || simulando) return

    setSimulando(true)
    try {
      const novo = {
        fornecedor,
        valor_total: parseFloat(valorTotal),
        data_compra: new Date().toISOString().split('T')[0]
      }
      const { data, error } = await supabase.from('compras_recibos').insert([novo]).select()
      if (error) throw error
      if (data) setRecibos([data[0], ...recibos])
      setFornecedor('')
      setValorTotal('')
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setSimulando(false)
    }
  }

  const excluirRecibo = async (id: string) => {
    if (!confirm('Deseja excluir este recibo?')) return
    try {
      await supabase.from('compras_recibos').delete().eq('id', id)
      setRecibos(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Compras Inteligentes & OCR
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Extração de cupons fiscais e controle de despensa.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>🧾 Simular Leitura de Cupom (OCR)</h2>
        <form onSubmit={handleSimularOCR} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Supermercado / Loja</label>
            <input type="text" className="input" placeholder="Ex: Assaí Atacadista" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} required />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Valor Total (R$)</label>
            <input type="number" step="0.01" className="input" placeholder="0.00" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary" disabled={simulando}>
            {simulando ? 'Processando IA...' : '+ Simular Extração OCR'}
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Cupons Processados</h2>
        {recibos.length === 0 && !carregando ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhum recibo processado.
          </div>
        ) : (
          <div className="tabela-container">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Fornecedor</th>
                  <th>Valor Total</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {recibos.map(r => (
                  <tr key={r.id}>
                    <td>{r.data_compra ? new Date(r.data_compra).toLocaleDateString('pt-BR') : '-'}</td>
                    <td style={{ fontWeight: 600 }}>{r.fornecedor || 'Desconhecido'}</td>
                    <td style={{ fontWeight: 700, color: 'var(--cor-sucesso)' }}>R$ {Number(r.valor_total).toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" onClick={() => excluirRecibo(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
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
