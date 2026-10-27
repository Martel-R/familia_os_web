'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface ContaBancaria {
  id: string
  nome: string
  instituicao?: string
  saldo_atual: number
  cor?: string
}

interface Cofrinho {
  id: string
  nome: string
  meta_valor: number
  saldo_atual: number
  icone?: string
}

interface Transacao {
  id: string
  descricao: string
  tipo: 'receita' | 'despesa_fixa' | 'despesa_variavel' | 'assinatura'
  valor: number
  data_vencimento: string
  status: 'pendente' | 'pago' | 'atrasado'
  conta_id?: string
  cofrinho_id?: string
}

interface ItemContracheque {
  descricao: string
  tipo: string
  valor: number
}

interface ContrachequeExtraido {
  fonte_pagadora?: string
  mes_ano_referencia?: string
  data_pagamento?: string
  total_vencimentos: number
  total_descontos: number
  valor_liquido: number
  itens: ItemContracheque[]
}

export default function FinancasPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [cofrinhos, setCofrinhos] = useState<Cofrinho[]>([])
  const [contas, setContas] = useState<ContaBancaria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Formulário manual de transação
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<'receita' | 'despesa_fixa' | 'despesa_variavel' | 'assinatura'>('despesa_variavel')
  const [dataVencimento, setDataVencimento] = useState('')
  const [contaIdSelecionada, setContaIdSelecionada] = useState('')

  // Modal de Nova Conta Bancária
  const [modalContaAberto, setModalContaAberto] = useState(false)
  const [novaContaNome, setNovaContaNome] = useState('')
  const [novaContaInstituicao, setNovaContaInstituicao] = useState('')
  const [novaContaSaldo, setNovaContaSaldo] = useState('0')
  const [salvandoConta, setSalvandoConta] = useState(false)

  // Modal de Operação em Cofrinho (Aporte / Resgate)
  const [cofrinhoOperacao, setCofrinhoOperacao] = useState<{ cofre: Cofrinho; tipo: 'deposito' | 'resgate' } | null>(null)
  const [valorAporte, setValorAporte] = useState('')
  const [contaAporteId, setContaAporteId] = useState('')
  const [salvandoAporte, setSalvandoAporte] = useState(false)

  // Modal de Importação de Contracheque
  const [modalContrachequeAberto, setModalContrachequeAberto] = useState(false)
  const [arquivoContracheque, setArquivoContracheque] = useState<File | null>(null)
  const [analisandoIA, setAnalisandoIA] = useState(false)
  const [dadosContracheque, setDadosContracheque] = useState<ContrachequeExtraido | null>(null)
  const [contaContrachequeId, setContaContrachequeId] = useState('')
  const [salvandoContracheque, setSalvandoContracheque] = useState(false)

  // Modal de Edição de Transação
  const [transacaoEditando, setTransacaoEditando] = useState<Transacao | null>(null)
  const [editDescricao, setEditDescricao] = useState('')
  const [editValor, setEditValor] = useState('')
  const [editTipo, setEditTipo] = useState<'receita' | 'despesa_fixa' | 'despesa_variavel' | 'assinatura'>('despesa_variavel')
  const [editDataVencimento, setEditDataVencimento] = useState('')
  const [editStatus, setEditStatus] = useState<'pendente' | 'pago' | 'atrasado'>('pendente')
  const [editContaId, setEditContaId] = useState('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  const carregarDados = async () => {
    try {
      setCarregando(true)

      const { data: contasData } = await supabase
        .from('contas_bancarias')
        .select('*')
        .order('nome', { ascending: true })

      if (contasData) {
        setContas(contasData)
        if (contasData.length > 0 && !contaIdSelecionada) {
          setContaIdSelecionada(contasData[0].id)
          setContaAporteId(contasData[0].id)
          setContaContrachequeId(contasData[0].id)
        }
      }

      const { data: cofrinhosData } = await supabase
        .from('cofrinhos')
        .select('*')
        .order('nome', { ascending: true })

      if (cofrinhosData) {
        setCofrinhos(cofrinhosData)
      }

      const { data: transacoesData } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .order('criado_em', { ascending: false })

      if (transacoesData) {
        setTransacoes(transacoesData)
      }
    } catch (err) {
      console.error('Falha ao carregar dados financeiros:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Cadastrar Nova Conta Bancária
  const handleCriarConta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novaContaNome.trim() || salvandoConta) return

    setSalvandoConta(true)
    try {
      const nova = {
        nome: novaContaNome,
        instituicao: novaContaInstituicao || 'Banco / Carteira',
        saldo_atual: parseFloat(novaContaSaldo) || 0,
      }

      const { data, error } = await supabase
        .from('contas_bancarias')
        .insert([nova])
        .select()

      if (error) {
        alert('Erro ao criar conta: ' + error.message)
      } else if (data) {
        setContas([...contas, data[0]])
        setNovaContaNome('')
        setNovaContaInstituicao('')
        setNovaContaSaldo('0')
        setModalContaAberto(false)
      }
    } finally {
      setSalvandoConta(false)
    }
  }

  // Operação em Cofrinho (Aporte ou Resgate)
  const handleAporteCofrinho = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cofrinhoOperacao || !valorAporte || salvandoAporte) return

    const val = parseFloat(valorAporte)
    if (isNaN(val) || val <= 0) {
      alert('Informe um valor válido.')
      return
    }

    setSalvandoAporte(true)
    try {
      const { cofre, tipo } = cofrinhoOperacao
      const novoSaldoCofre =
        tipo === 'deposito'
          ? Number(cofre.saldo_atual || 0) + val
          : Math.max(0, Number(cofre.saldo_atual || 0) - val)

      // 1. Atualizar saldo do cofrinho
      const { error: errCofre } = await supabase
        .from('cofrinhos')
        .update({ saldo_atual: novoSaldoCofre })
        .eq('id', cofre.id)

      if (errCofre) throw errCofre

      // 2. Atualizar saldo da conta bancária vinculada (se selecionada)
      if (contaAporteId) {
        const contaAlvo = contas.find((c) => c.id === contaAporteId)
        if (contaAlvo) {
          const novoSaldoConta =
            tipo === 'deposito'
              ? Number(contaAlvo.saldo_atual || 0) - val
              : Number(contaAlvo.saldo_atual || 0) + val

          await supabase
            .from('contas_bancarias')
            .update({ saldo_atual: novoSaldoConta })
            .eq('id', contaAlvo.id)
        }
      }

      // 3. Registrar no histórico de aportes
      await supabase.from('cofrinhos_aportes').insert([
        {
          cofrinho_id: cofre.id,
          conta_id: contaAporteId || null,
          tipo,
          valor: val,
          descricao:
            tipo === 'deposito'
              ? `Aporte para ${cofre.nome}`
              : `Resgate de ${cofre.nome}`,
        },
      ])

      // 4. Registrar no fluxo de transações para transparência
      const hoje = new Date().toISOString().split('T')[0]
      await supabase.from('transacoes_financeiras').insert([
        {
          descricao:
            tipo === 'deposito'
              ? `Aporte Cofrinho: ${cofre.nome}`
              : `Resgate Cofrinho: ${cofre.nome}`,
          tipo: tipo === 'deposito' ? 'despesa_variavel' : 'receita',
          valor: val,
          data_vencimento: hoje,
          data_pagamento: hoje,
          status: 'pago',
          conta_id: contaAporteId || null,
          cofrinho_id: cofre.id,
        },
      ])

      await carregarDados()
      setCofrinhoOperacao(null)
      setValorAporte('')
      alert(`Operação de ${tipo === 'deposito' ? 'depósito' : 'resgate'} realizada com sucesso!`)
    } catch (err: any) {
      alert('Erro na operação do cofrinho: ' + err.message)
    } finally {
      setSalvandoAporte(false)
    }
  }

  // Lançamento Manual de Transação
  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!descricao || !valor || !dataVencimento || salvando) return

    setSalvando(true)
    try {
      const val = parseFloat(valor)
      const novaTransacao = {
        descricao,
        tipo,
        valor: val,
        data_vencimento: dataVencimento,
        status: 'pendente' as const,
        conta_id: contaIdSelecionada || null,
      }

      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .insert([novaTransacao])
        .select()

      if (error) {
        alert('Erro ao salvar no Supabase: ' + error.message)
      } else if (data) {
        // Atualizar saldo da conta caso já esteja pago
        if (contaIdSelecionada) {
          const contaAlvo = contas.find((c) => c.id === contaIdSelecionada)
          if (contaAlvo) {
            const delta = tipo === 'receita' ? val : -val
            await supabase
              .from('contas_bancarias')
              .update({ saldo_atual: Number(contaAlvo.saldo_atual || 0) + delta })
              .eq('id', contaAlvo.id)
          }
        }

        await carregarDados()
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

  // Edição e Exclusão
  const iniciarEdicao = (t: Transacao) => {
    setTransacaoEditando(t)
    setEditDescricao(t.descricao)
    setEditValor(String(t.valor))
    setEditTipo(t.tipo)
    setEditDataVencimento(t.data_vencimento)
    setEditStatus(t.status)
    setEditContaId(t.conta_id || '')
  }

  const salvarEdicaoFinal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transacaoEditando || !editDescricao || !editValor || !editDataVencimento || salvandoEdicao) return

    setSalvandoEdicao(true)
    try {
      const atualizacao = {
        descricao: editDescricao,
        valor: parseFloat(editValor),
        tipo: editTipo,
        data_vencimento: editDataVencimento,
        status: editStatus,
        conta_id: editContaId || null,
      }

      const { data, error } = await supabase
        .from('transacoes_financeiras')
        .update(atualizacao)
        .eq('id', transacaoEditando.id)
        .select()

      if (error) {
        alert('Erro ao atualizar: ' + error.message)
      } else if (data) {
        await carregarDados()
        setTransacaoEditando(null)
      }
    } finally {
      setSalvandoEdicao(false)
    }
  }

  const excluirTransacao = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento financeiro?')) return

    try {
      const { error } = await supabase
        .from('transacoes_financeiras')
        .delete()
        .eq('id', id)

      if (error) {
        alert('Erro ao excluir: ' + error.message)
      } else {
        await carregarDados()
      }
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  // Importar Contracheque
  const analisarContrachequeIA = async () => {
    if (!arquivoContracheque || analisandoIA) return

    setAnalisandoIA(true)
    try {
      const formData = new FormData()
      formData.append('file', arquivoContracheque)

      const response = await fetch('/api/ocr/payslip', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Falha no OCR (${response.status})`)
      }

      const resultado: ContrachequeExtraido = await response.json()
      setDadosContracheque(resultado)
    } catch (err: any) {
      alert('Erro ao processar contracheque: ' + err.message)
    } finally {
      setAnalisandoIA(false)
    }
  }

  const salvarContrachequeFinal = async () => {
    if (!dadosContracheque || !arquivoContracheque || salvandoContracheque) return

    setSalvandoContracheque(true)
    try {
      const extensao = arquivoContracheque.name.split('.').pop() || 'pdf'
      const nomeArquivo = `contracheques/${Date.now()}_contracheque.${extensao}`

      await supabase.storage
        .from('familia-os-documentos')
        .upload(nomeArquivo, arquivoContracheque)

      const competencia = dadosContracheque.mes_ano_referencia || 'Competência Recente'
      const fonte = dadosContracheque.fonte_pagadora || 'Empregador'
      const hoje = new Date().toISOString().split('T')[0]

      const novaReceita = {
        descricao: `Salário Líquido - ${competencia} (${fonte})`,
        tipo: 'receita' as const,
        valor: dadosContracheque.valor_liquido,
        data_vencimento: dadosContracheque.data_pagamento || hoje,
        data_pagamento: dadosContracheque.data_pagamento || hoje,
        status: 'pago' as const,
        conta_id: contaContrachequeId || null,
        observacoes: `Bruto: R$ ${dadosContracheque.total_vencimentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Descontos: R$ ${dadosContracheque.total_descontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Arquivo: ${nomeArquivo}`,
      }

      await supabase.from('transacoes_financeiras').insert([novaReceita])

      // Creditar saldo na conta escolhida
      if (contaContrachequeId) {
        const contaAlvo = contas.find((c) => c.id === contaContrachequeId)
        if (contaAlvo) {
          await supabase
            .from('contas_bancarias')
            .update({
              saldo_atual: Number(contaAlvo.saldo_atual || 0) + dadosContracheque.valor_liquido,
            })
            .eq('id', contaAlvo.id)
        }
      }

      await carregarDados()
      setModalContrachequeAberto(false)
      setArquivoContracheque(null)
      setDadosContracheque(null)
      alert('Contracheque lançado e creditado na conta com sucesso!')
    } catch (err: any) {
      alert('Erro ao finalizar contracheque: ' + err.message)
    } finally {
      setSalvandoContracheque(false)
    }
  }

  // Inicializar contas e cofrinhos se vazios
  const semearExemplos = async () => {
    setSalvando(true)
    try {
      const contasIniciais = [
        { nome: 'Nubank Principal', instituicao: 'Nubank', saldo_atual: 4250.0 },
        { nome: 'Itaú Família', instituicao: 'Itaú', saldo_atual: 1800.0 },
        { nome: 'Carteira / Dinheiro', instituicao: 'Dinheiro', saldo_atual: 350.0 },
      ]
      const { data: contasCriadas } = await supabase
        .from('contas_bancarias')
        .insert(contasIniciais)
        .select()

      const contaPadraoId = contasCriadas ? contasCriadas[0].id : null

      const cofrinhosExemplo = [
        { nome: '🏖️ Férias de Verão', meta_valor: 10000.0, saldo_atual: 7000.0, icone: '🏖️' },
        { nome: '🛡️ Reserva de Emergência', meta_valor: 20000.0, saldo_atual: 18400.0, icone: '🛡️' },
      ]
      await supabase.from('cofrinhos').insert(cofrinhosExemplo)

      const transExemplo = [
        { descricao: 'Salário Principal', tipo: 'receita', valor: 9500.0, data_vencimento: '2026-11-05', status: 'pago', conta_id: contaPadraoId },
        { descricao: 'Aluguel do Imóvel', tipo: 'despesa_fixa', valor: 2200.0, data_vencimento: '2026-11-10', status: 'pendente', conta_id: contaPadraoId },
      ]
      await supabase.from('transacoes_financeiras').insert(transExemplo)

      await carregarDados()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      {/* Topo / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Finanças & Fluxo de Caixa
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Contas bancárias, cofrinhos de reserva e fluxo de receitas e despesas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setModalContaAberto(true)} className="btn btn-secondary">
            🏦 + Nova Conta Bancária
          </button>
          <button onClick={() => setModalContrachequeAberto(true)} className="btn btn-primary">
            📄 Importar Contracheque (IA)
          </button>
          {contas.length === 0 && !carregando && (
            <button onClick={semearExemplos} className="btn btn-secondary" disabled={salvando}>
              🌱 Inicializar Estrutura Padrão
            </button>
          )}
        </div>
      </div>

      {/* Seção 1: Minhas Contas Bancárias & Carteiras */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Minhas Contas & Carteiras</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)' }}>
            Saldo Total Consolidado: <strong>R$ {contas.reduce((acc, c) => acc + Number(c.saldo_atual || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </span>
        </div>

        {contas.length === 0 && !carregando ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '24px' }}>
            Nenhuma conta bancária cadastrada. Clique em "+ Nova Conta Bancária" para começar.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {contas.map((conta) => (
              <div key={conta.id} className="card" style={{ borderLeft: '4px solid var(--cor-primaria)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{conta.nome}</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>{conta.instituicao || 'Conta'}</div>
                  </div>
                  <span className="badge badge-primary">Ativa</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px', color: Number(conta.saldo_atual) >= 0 ? 'var(--cor-sucesso)' : 'var(--cor-perigo)' }}>
                  R$ {Number(conta.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção 2: Cofrinhos / Metas (Férias & Reserva) com Aportes e Resgates */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Cofrinhos & Metas da Família</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {cofrinhos.map((cofre) => {
            const porcentagem = Math.min(Math.round((cofre.saldo_atual / cofre.meta_valor) * 100), 100)
            return (
              <div key={cofre.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{cofre.nome}</span>
                  <span className="badge badge-primary">{porcentagem}%</span>
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                  R$ {Number(cofre.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                  <span style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', fontWeight: 400 }}>
                    de R$ {Number(cofre.meta_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--raio-full)', marginTop: '12px', overflow: 'hidden' }}>
                  <div style={{ width: `${porcentagem}%`, height: '100%', backgroundColor: 'var(--cor-primaria)', borderRadius: 'var(--raio-full)' }} />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={() => setCofrinhoOperacao({ cofre, tipo: 'deposito' })}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    + Guardar Dinheiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setCofrinhoOperacao({ cofre, tipo: 'resgate' })}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    - Resgatar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de Operação em Cofrinho (Aporte / Resgate) */}
      {cofrinhoOperacao && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '460px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {cofrinhoOperacao.tipo === 'deposito' ? '💰 Guardar no Cofrinho' : '💸 Resgatar do Cofrinho'}
              </h2>
              <button
                type="button"
                onClick={() => setCofrinhoOperacao(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginBottom: '16px' }}>
              Cofrinho: <strong>{cofrinhoOperacao.cofre.nome}</strong> (Saldo Atual: R$ {Number(cofrinhoOperacao.cofre.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
            </p>

            <form onSubmit={handleAporteCofrinho} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="input"
                  placeholder="0,00"
                  value={valorAporte}
                  onChange={(e) => setValorAporte(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {cofrinhoOperacao.tipo === 'deposito' ? 'De qual conta sai o dinheiro?' : 'Para qual conta transferir o resgate?'}
                </label>
                <select
                  className="input"
                  value={contaAporteId}
                  onChange={(e) => setContaAporteId(e.target.value)}
                  required
                >
                  <option value="">Selecione uma conta</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} (Saldo: R$ {Number(c.saldo_atual || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setCofrinhoOperacao(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoAporte}>
                  {salvandoAporte ? 'Processando...' : cofrinhoOperacao.tipo === 'deposito' ? 'Confirmar Aporte' : 'Confirmar Resgate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nova Conta Bancária */}
      {modalContaAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '460px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>🏦 Nova Conta / Carteira</h2>
              <button
                type="button"
                onClick={() => setModalContaAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCriarConta} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Conta / Identificação</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Nubank Principal, Itaú, Carteira Dinheiro"
                  value={novaContaNome}
                  onChange={(e) => setNovaContaNome(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Instituição Financeira</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Nubank, Itaú, Inter, Espécie"
                  value={novaContaInstituicao}
                  onChange={(e) => setNovaContaInstituicao(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Saldo Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={novaContaSaldo}
                  onChange={(e) => setNovaContaSaldo(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalContaAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoConta}>
                  {salvandoConta ? 'Salvando...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Transação */}
      {transacaoEditando && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '540px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>✏️ Editar Lançamento Financeiro</h2>
              <button
                type="button"
                onClick={() => setTransacaoEditando(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarEdicaoFinal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Descrição</label>
                <input
                  type="text"
                  className="input"
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={editValor}
                    onChange={(e) => setEditValor(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo</label>
                  <select
                    className="input"
                    value={editTipo}
                    onChange={(e) => setEditTipo(e.target.value as any)}
                  >
                    <option value="despesa_variavel">Despesa Variável</option>
                    <option value="despesa_fixa">Despesa Fixa</option>
                    <option value="assinatura">Assinatura</option>
                    <option value="receita">Receita</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Data de Vencimento</label>
                  <input
                    type="date"
                    className="input"
                    value={editDataVencimento}
                    onChange={(e) => setEditDataVencimento(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Status do Pagamento</label>
                  <select
                    className="input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                  >
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                    <option value="atrasado">Atrasado</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Vincular à Conta Bancária</label>
                <select
                  className="input"
                  value={editContaId}
                  onChange={(e) => setEditContaId(e.target.value)}
                >
                  <option value="">Nenhuma conta vinculada</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setTransacaoEditando(null)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoEdicao}>
                  {salvandoEdicao ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Importação de Contracheque */}
      {modalContrachequeAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div className="card" style={{ width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>📄 Importar Contracheque com IA</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                  Extração automática de proventos e descontos via Gemini e arquivamento no Storage.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalContrachequeAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Selecione o arquivo do contracheque (PDF, PNG ou JPEG):</label>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                className="input"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setArquivoContracheque(e.target.files[0])
                    setDadosContracheque(null)
                  }
                }}
              />
            </div>

            {arquivoContracheque && !dadosContracheque && (
              <button
                type="button"
                onClick={analisarContrachequeIA}
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: '16px' }}
                disabled={analisandoIA}
              >
                {analisandoIA ? 'Analisando documento com Gemini 2.5 Flash... 🧠' : '✨ Processar Documento com IA'}
              </button>
            )}

            {dadosContracheque && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Fonte Pagadora</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dadosContracheque.fonte_pagadora || 'Identificada'}</div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Competência</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dadosContracheque.mes_ano_referencia || 'N/A'}</div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Total Bruto</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      R$ {Number(dadosContracheque.total_vencimentos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Descontos</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--cor-perigo)' }}>
                      - R$ {Number(dadosContracheque.total_descontos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--raio-md)',
                    backgroundColor: 'var(--cor-sucesso-suave)',
                    border: '1px solid var(--cor-sucesso)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--cor-sucesso)' }}>
                      SALÁRIO LÍQUIDO A REGISTRAR
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>
                      Será creditado na conta selecionada
                    </div>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--cor-sucesso)' }}>
                    R$ {Number(dadosContracheque.valor_liquido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Creditar o valor em qual conta bancária?</label>
                  <select
                    className="input"
                    value={contaContrachequeId}
                    onChange={(e) => setContaContrachequeId(e.target.value)}
                  >
                    <option value="">Nenhuma conta específica</option>
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} (Saldo atual: R$ {Number(c.saldo_atual || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={salvarContrachequeFinal}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={salvandoContracheque}
                >
                  {salvandoContracheque ? 'Enviando ao Storage e salvando...' : '💾 Confirmar e Creditar na Conta'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formulário Rápido de Lançamento Manual com Seleção de Conta */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Novo Lançamento Financeiro Manual</h2>
        <form onSubmit={handleAdicionar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
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
            <label className="form-label">Conta Bancária</label>
            <select
              className="input"
              value={contaIdSelecionada}
              onChange={(e) => setContaIdSelecionada(e.target.value)}
            >
              <option value="">Sem vínculo</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Vencimento</label>
            <input
              type="date"
              className="input"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvando}>
            {salvando ? 'Salvando...' : '+ Lançar'}
          </button>
        </form>
      </div>

      {/* Lista de Transações com Nome da Conta Vinculada */}
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
                  <th>Conta Bancária</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map((t) => {
                  const contaVinculada = contas.find((c) => c.id === t.conta_id)
                  return (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 500 }}>{t.descricao}</td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>
                          {t.tipo.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {contaVinculada ? (
                          <span className="badge badge-primary">
                            🏦 {contaVinculada.nome}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--texto-secundario)', fontSize: '0.8rem' }}>-</span>
                        )}
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
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => iniciarEdicao(t)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            title="Editar lançamento"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => excluirTransacao(t.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--cor-perigo)' }}
                            title="Excluir lançamento"
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
