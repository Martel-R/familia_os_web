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
  data_limite?: string
}

interface DespesaRecorrente {
  id: string
  nome: string
  tipo: 'emprestimo' | 'financiamento' | 'despesa_fixa' | 'assinatura'
  valor_parcela: number
  dia_vencimento: number
  total_parcelas?: number
  parcelas_pagas?: number
  saldo_devedor_total?: number
  conta_padrao_id?: string
  palavras_chave_extrato?: string
  ativo: boolean
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
  recorrencia_id?: string
  comprovante_url?: string
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

interface TransacaoDocumento {
  data?: string
  descricao: string
  categoria_sugerida?: string
  tipo: string
  valor: number
  recorrencia_id?: string
}

interface DocumentoFinanceiroExtraido {
  tipo_documento: string
  instituicao?: string
  periodo_referencia?: string
  data_vencimento_fatura?: string
  valor_total?: number
  transacoes: TransacaoDocumento[]
}

export default function FinancasPage() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([])
  const [cofrinhos, setCofrinhos] = useState<Cofrinho[]>([])
  const [contas, setContas] = useState<ContaBancaria[]>([])
  const [recorrentes, setRecorrentes] = useState<DespesaRecorrente[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Paginação da tabela de transações (20 registros por página)
  const ITENS_POR_PAGINA = 20
  const [paginaAtual, setPaginaAtual] = useState(1)

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

  // Modal de Criação / Edição de Cofrinho
  const [modalCofrinhoCriarAberto, setModalCofrinhoCriarAberto] = useState(false)
  const [cofrinhoEditando, setCofrinhoEditando] = useState<Cofrinho | null>(null)
  const [nomeCofrinho, setNomeCofrinho] = useState('')
  const [metaCofrinho, setMetaCofrinho] = useState('')
  const [saldoInicialCofrinho, setSaldoInicialCofrinho] = useState('0')
  const [iconeCofrinho, setIconeCofrinho] = useState('🐷')
  const [dataLimiteCofrinho, setDataLimiteCofrinho] = useState('')
  const [salvandoCofrinho, setSalvandoCofrinho] = useState(false)

  // Modal de Criação / Edição de Empréstimo ou Recorrência
  const [modalRecorrenteAberto, setModalRecorrenteAberto] = useState(false)
  const [recorrenteEditando, setRecorrenteEditando] = useState<DespesaRecorrente | null>(null)
  const [nomeRec, setNomeRec] = useState('')
  const [tipoRec, setTipoRec] = useState<'emprestimo' | 'financiamento' | 'despesa_fixa' | 'assinatura'>('emprestimo')
  const [valorParcelaRec, setValorParcelaRec] = useState('')
  const [diaVencimentoRec, setDiaVencimentoRec] = useState('10')
  const [totalParcelasRec, setTotalParcelasRec] = useState('36')
  const [parcelasPagasRec, setParcelasPagasRec] = useState('0')
  const [saldoDevedorRec, setSaldoDevedorRec] = useState('')
  const [contaPadraoRecId, setContaPadraoRecId] = useState('')
  const [palavrasChaveRec, setPalavrasChaveRec] = useState('')
  const [salvandoRecorrente, setSalvandoRecorrente] = useState(false)

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

  // Modal de Importação de Extrato Bancário / Fatura de Cartão
  const [modalDocAberto, setModalDocAberto] = useState(false)
  const [arquivoDoc, setArquivoDoc] = useState<File | null>(null)
  const [analisandoDoc, setAnalisandoDoc] = useState(false)
  const [dadosDoc, setDadosDoc] = useState<DocumentoFinanceiroExtraido | null>(null)
  const [contaDocId, setContaDocId] = useState('')
  const [transacoesSelecionadas, setTransacoesSelecionadas] = useState<number[]>([])
  const [salvandoDoc, setSalvandoDoc] = useState(false)

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
        if (contasData.length > 0) {
          if (!contaIdSelecionada) setContaIdSelecionada(contasData[0].id)
          if (!contaAporteId) setContaAporteId(contasData[0].id)
          if (!contaContrachequeId) setContaContrachequeId(contasData[0].id)
          if (!contaDocId) setContaDocId(contasData[0].id)
          if (!contaPadraoRecId) setContaPadraoRecId(contasData[0].id)
        }
      }

      const { data: cofrinhosData } = await supabase
        .from('cofrinhos')
        .select('*')
        .order('nome', { ascending: true })

      if (cofrinhosData) {
        setCofrinhos(cofrinhosData)
      }

      const { data: recData } = await supabase
        .from('despesas_recorrentes')
        .select('*')
        .order('nome', { ascending: true })

      if (recData) {
        setRecorrentes(recData)
      }

      const { data: transacoesData } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .order('data_vencimento', { ascending: false })

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

  // Agrupamento mensal para o gráfico de Entradas vs Saídas
  const dadosGrafico = (() => {
    const mapa: { [mes: string]: { receitas: number; despesas: number } } = {}

    transacoes.forEach((t) => {
      const chaveAnoMes = t.data_vencimento ? t.data_vencimento.substring(0, 7) : '2026-10'
      if (!mapa[chaveAnoMes]) {
        mapa[chaveAnoMes] = { receitas: 0, despesas: 0 }
      }
      const v = Number(t.valor) || 0
      if (t.tipo === 'receita') {
        mapa[chaveAnoMes].receitas += v
      } else {
        mapa[chaveAnoMes].despesas += v
      }
    })

    const chavesOrdenadas = Object.keys(mapa).sort()

    if (chavesOrdenadas.length === 0) {
      return [{ chave: '2026-10', rotulo: 'Out/26', receitas: 0, despesas: 0 }]
    }

    const nomesMeses: { [m: string]: string } = {
      '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
      '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
    }

    return chavesOrdenadas.slice(-6).map((chave) => {
      const [ano, mes] = chave.split('-')
      const rotulo = `${nomesMeses[mes] || mes}/${ano ? ano.substring(2) : ''}`
      return {
        chave,
        rotulo,
        receitas: mapa[chave].receitas,
        despesas: mapa[chave].despesas,
      }
    })
  })()

  const maxValorGrafico = Math.max(
    ...dadosGrafico.map((d) => Math.max(d.receitas, d.despesas)),
    1000
  )

  // Cálculo da Paginação
  const totalPaginas = Math.ceil(transacoes.length / ITENS_POR_PAGINA) || 1
  const indiceInicio = (paginaAtual - 1) * ITENS_POR_PAGINA
  const transacoesPaginadas = transacoes.slice(indiceInicio, indiceInicio + ITENS_POR_PAGINA)

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

  // Criar ou Editar Cofrinho
  const iniciarCriacaoCofrinho = () => {
    setCofrinhoEditando(null)
    setNomeCofrinho('')
    setMetaCofrinho('')
    setSaldoInicialCofrinho('0')
    setIconeCofrinho('🐷')
    setDataLimiteCofrinho('')
    setModalCofrinhoCriarAberto(true)
  }

  const iniciarEdicaoCofrinho = (c: Cofrinho) => {
    setCofrinhoEditando(c)
    setNomeCofrinho(c.nome)
    setMetaCofrinho(String(c.meta_valor))
    setSaldoInicialCofrinho(String(c.saldo_atual || 0))
    setIconeCofrinho(c.icone || '🐷')
    setDataLimiteCofrinho(c.data_limite || '')
    setModalCofrinhoCriarAberto(true)
  }

  const handleSalvarCofrinho = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeCofrinho.trim() || !metaCofrinho || salvandoCofrinho) return

    setSalvandoCofrinho(true)
    try {
      const meta = parseFloat(metaCofrinho)

      if (cofrinhoEditando) {
        const { error } = await supabase
          .from('cofrinhos')
          .update({
            nome: nomeCofrinho,
            meta_valor: meta,
            icone: iconeCofrinho || '🐷',
            data_limite: dataLimiteCofrinho || null,
          })
          .eq('id', cofrinhoEditando.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('cofrinhos').insert([
          {
            nome: nomeCofrinho,
            meta_valor: meta,
            saldo_atual: parseFloat(saldoInicialCofrinho) || 0,
            icone: iconeCofrinho || '🐷',
            data_limite: dataLimiteCofrinho || null,
          },
        ])

        if (error) throw error
      }

      await carregarDados()
      setModalCofrinhoCriarAberto(false)
      alert(`Cofrinho ${cofrinhoEditando ? 'atualizado' : 'criado'} com sucesso!`)
    } catch (err: any) {
      alert('Erro ao salvar cofrinho: ' + err.message)
    } finally {
      setSalvandoCofrinho(false)
    }
  }

  const excluirCofrinho = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir o cofrinho "${nome}"? Todo o histórico de aportes e metas deste cofrinho será removido.`)) {
      return
    }

    try {
      const { error } = await supabase.from('cofrinhos').delete().eq('id', id)
      if (error) {
        alert('Erro ao excluir cofrinho: ' + error.message)
      } else {
        setCofrinhos(cofrinhos.filter((c) => c.id !== id))
        alert('Cofrinho excluído com sucesso!')
      }
    } catch (err: any) {
      alert('Erro ao excluir cofrinho: ' + err.message)
    }
  }

  // Criar ou Editar Empréstimo / Recorrência
  const iniciarCriacaoRecorrente = () => {
    setRecorrenteEditando(null)
    setNomeRec('')
    setTipoRec('emprestimo')
    setValorParcelaRec('')
    setDiaVencimentoRec('10')
    setTotalParcelasRec('36')
    setParcelasPagasRec('0')
    setSaldoDevedorRec('')
    setPalavrasChaveRec('')
    setModalRecorrenteAberto(true)
  }

  const iniciarEdicaoRecorrente = (r: DespesaRecorrente) => {
    setRecorrenteEditando(r)
    setNomeRec(r.nome)
    setTipoRec(r.tipo)
    setValorParcelaRec(String(r.valor_parcela))
    setDiaVencimentoRec(String(r.dia_vencimento))
    setTotalParcelasRec(r.total_parcelas ? String(r.total_parcelas) : '')
    setParcelasPagasRec(String(r.parcelas_pagas || 0))
    setSaldoDevedorRec(r.saldo_devedor_total ? String(r.saldo_devedor_total) : '')
    setContaPadraoRecId(r.conta_padrao_id || '')
    setPalavrasChaveRec(r.palavras_chave_extrato || '')
    setModalRecorrenteAberto(true)
  }

  const handleSalvarRecorrente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeRec.trim() || !valorParcelaRec || salvandoRecorrente) return

    setSalvandoRecorrente(true)
    try {
      const payload: any = {
        nome: nomeRec,
        tipo: tipoRec,
        valor_parcela: parseFloat(valorParcelaRec),
        dia_vencimento: parseInt(diaVencimentoRec) || 10,
        total_parcelas: totalParcelasRec ? parseInt(totalParcelasRec) : null,
        parcelas_pagas: parseInt(parcelasPagasRec) || 0,
        saldo_devedor_total: saldoDevedorRec ? parseFloat(saldoDevedorRec) : null,
        conta_padrao_id: contaPadraoRecId || null,
        palavras_chave_extrato: palavrasChaveRec || null,
        ativo: true,
      }

      if (recorrenteEditando) {
        const { error } = await supabase
          .from('despesas_recorrentes')
          .update(payload)
          .eq('id', recorrenteEditando.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('despesas_recorrentes')
          .insert([payload])
        if (error) throw error
      }

      await carregarDados()
      setModalRecorrenteAberto(false)
      alert(`Compromisso ${recorrenteEditando ? 'atualizado' : 'cadastrado'} com sucesso!`)
    } catch (err: any) {
      alert('Erro ao salvar compromisso recorrente: ' + err.message)
    } finally {
      setSalvandoRecorrente(false)
    }
  }

  const excluirRecorrente = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir o controle de "${nome}"?`)) return
    try {
      const { error } = await supabase.from('despesas_recorrentes').delete().eq('id', id)
      if (error) throw error
      setRecorrentes(recorrentes.filter((r) => r.id !== id))
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  const quitarParcelaManual = async (r: DespesaRecorrente) => {
    const proxParcela = (r.parcelas_pagas || 0) + 1
    if (!confirm(`Confirmar o pagamento da parcela ${proxParcela}/${r.total_parcelas || '?'} de R$ ${Number(r.valor_parcela).toFixed(2)} para "${r.nome}"?`)) {
      return
    }

    try {
      const novoPagas = (r.parcelas_pagas || 0) + 1
      const novoSaldoDevedor = r.saldo_devedor_total
        ? Math.max(0, Number(r.saldo_devedor_total) - Number(r.valor_parcela))
        : null

      await supabase
        .from('despesas_recorrentes')
        .update({
          parcelas_pagas: novoPagas,
          saldo_devedor_total: novoSaldoDevedor,
        })
        .eq('id', r.id)

      const hoje = new Date().toISOString().split('T')[0]
      await supabase.from('transacoes_financeiras').insert([
        {
          descricao: `Parcela ${novoPagas}/${r.total_parcelas || '?'} - ${r.nome}`,
          tipo: 'despesa_fixa',
          valor: r.valor_parcela,
          data_vencimento: hoje,
          data_pagamento: hoje,
          status: 'pago',
          conta_id: r.conta_padrao_id || null,
          recorrencia_id: r.id,
        },
      ])

      if (r.conta_padrao_id) {
        const contaAlvo = contas.find((c) => c.id === r.conta_padrao_id)
        if (contaAlvo) {
          await supabase
            .from('contas_bancarias')
            .update({
              saldo_atual: Number(contaAlvo.saldo_atual || 0) - Number(r.valor_parcela),
            })
            .eq('id', contaAlvo.id)
        }
      }

      await carregarDados()
      alert(`Parcela ${novoPagas} de ${r.nome} quitada com sucesso!`)
    } catch (err: any) {
      alert('Erro ao quitar parcela: ' + err.message)
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

      const { error: errCofre } = await supabase
        .from('cofrinhos')
        .update({ saldo_atual: novoSaldoCofre })
        .eq('id', cofre.id)

      if (errCofre) throw errCofre

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

  // Edição e Exclusão de Transação
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

      const { data: urlDataContracheque } = supabase.storage
        .from('familia-os-documentos')
        .getPublicUrl(nomeArquivo)

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
        comprovante_url: urlDataContracheque?.publicUrl || null,
        observacoes: `Bruto: R$ ${dadosContracheque.total_vencimentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Descontos: R$ ${dadosContracheque.total_descontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Arquivo: ${nomeArquivo}`,
      }

      await supabase.from('transacoes_financeiras').insert([novaReceita])

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

  // Importar Extrato Bancário ou Fatura de Cartão (com Conciliação Inteligente de Empréstimos)
  const analisarDocumentoIA = async () => {
    if (!arquivoDoc || analisandoDoc) return

    setAnalisandoDoc(true)
    try {
      const formData = new FormData()
      formData.append('file', arquivoDoc)

      const response = await fetch('/api/ocr/financial-doc', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Falha no processamento (${response.status})`)
      }

      const resultado: DocumentoFinanceiroExtraido = await response.json()

      if (resultado.transacoes && recorrentes.length > 0) {
        resultado.transacoes = resultado.transacoes.map((t) => {
          const match = recorrentes.find((r) => {
            const descLower = t.descricao.toLowerCase()
            const nomeLower = r.nome.toLowerCase()

            const matchNome = descLower.includes(nomeLower)
            const matchKeywords = r.palavras_chave_extrato
              ? r.palavras_chave_extrato
                  .toLowerCase()
                  .split(',')
                  .some((kw) => kw.trim() && descLower.includes(kw.trim()))
              : false

            const matchValor = Math.abs(t.valor - Number(r.valor_parcela)) < 1.0
            return (matchNome || matchKeywords) && (matchValor || t.tipo === 'despesa')
          })

          if (match) {
            const prox = (match.parcelas_pagas || 0) + 1
            return {
              ...t,
              recorrencia_id: match.id,
              descricao: `[Conciliado: ${match.nome} - Parc. ${prox}/${match.total_parcelas || '?'}] ${t.descricao}`,
            }
          }
          return t
        })
      }

      setDadosDoc(resultado)
      setTransacoesSelecionadas(resultado.transacoes.map((_, idx) => idx))
    } catch (err: any) {
      alert('Erro ao analisar documento com IA: ' + err.message)
    } finally {
      setAnalisandoDoc(false)
    }
  }

  const toggleTransacaoSelecionada = (idx: number) => {
    if (transacoesSelecionadas.includes(idx)) {
      setTransacoesSelecionadas(transacoesSelecionadas.filter((i) => i !== idx))
    } else {
      setTransacoesSelecionadas([...transacoesSelecionadas, idx])
    }
  }

  const salvarDocumentoFinal = async () => {
    if (!dadosDoc || !arquivoDoc || salvandoDoc || transacoesSelecionadas.length === 0) return

    setSalvandoDoc(true)
    try {
      const extensao = arquivoDoc.name.split('.').pop() || 'pdf'
      const pasta = dadosDoc.tipo_documento === 'fatura_cartao' ? 'faturas' : 'extratos'
      const nomeArquivo = `${pasta}/${Date.now()}_${dadosDoc.tipo_documento}.${extensao}`

      await supabase.storage
        .from('familia-os-documentos')
        .upload(nomeArquivo, arquivoDoc)

      const { data: urlDataDoc } = supabase.storage
        .from('familia-os-documentos')
        .getPublicUrl(nomeArquivo)

      const transacoesParaInserir = dadosDoc.transacoes
        .filter((_, idx) => transacoesSelecionadas.includes(idx))
        .map((t) => {
          const hoje = new Date().toISOString().split('T')[0]
          const isFatura = dadosDoc.tipo_documento === 'fatura_cartao'
          const dataVenc = isFatura
            ? dadosDoc.data_vencimento_fatura || hoje
            : t.data || hoje

          return {
            descricao: isFatura ? `[Cartão] ${t.descricao}` : t.descricao,
            tipo: (t.tipo === 'receita' ? 'receita' : 'despesa_variavel') as any,
            valor: Math.abs(t.valor),
            data_vencimento: dataVenc,
            data_pagamento: isFatura ? null : t.data || hoje,
            status: (isFatura ? 'pendente' : 'pago') as any,
            conta_id: contaDocId || null,
            recorrencia_id: t.recorrencia_id || null,
            comprovante_url: urlDataDoc?.publicUrl || null,
            observacoes: `Importado via OCR (${dadosDoc.instituicao || 'Documento'}) | Anexo: ${nomeArquivo}`,
          }
        })

      const { error: erroInsert } = await supabase
        .from('transacoes_financeiras')
        .insert(transacoesParaInserir)

      if (erroInsert) throw erroInsert

      for (const t of transacoesParaInserir) {
        if (t.recorrencia_id) {
          const recAlvo = recorrentes.find((r) => r.id === t.recorrencia_id)
          if (recAlvo) {
            const novoPagas = (recAlvo.parcelas_pagas || 0) + 1
            const novoSaldo = recAlvo.saldo_devedor_total
              ? Math.max(0, Number(recAlvo.saldo_devedor_total) - t.valor)
              : null

            await supabase
              .from('despesas_recorrentes')
              .update({
                parcelas_pagas: novoPagas,
                saldo_devedor_total: novoSaldo,
              })
              .eq('id', recAlvo.id)
          }
        }
      }

      if (contaDocId && dadosDoc.tipo_documento === 'extrato_bancario') {
        const delta = transacoesParaInserir.reduce((acc, t) => {
          return t.tipo === 'receita' ? acc + t.valor : acc - t.valor
        }, 0)

        const contaAlvo = contas.find((c) => c.id === contaDocId)
        if (contaAlvo) {
          await supabase
            .from('contas_bancarias')
            .update({ saldo_atual: Number(contaAlvo.saldo_atual || 0) + delta })
            .eq('id', contaAlvo.id)
        }
      }

      await carregarDados()
      setModalDocAberto(false)
      setArquivoDoc(null)
      setDadosDoc(null)
      alert(`Sucesso! ${transacoesParaInserir.length} lançamentos foram importados, conciliados e salvos no financeiro.`)
    } catch (err: any) {
      alert('Erro ao salvar lançamentos no banco: ' + err.message)
    } finally {
      setSalvandoDoc(false)
    }
  }

  return (
    <div>
      {/* Topo / Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Finanças & Fluxo de Caixa
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Contas bancárias, cofrinhos, empréstimos recorrentes e faturas conciliadas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setModalContaAberto(true)} className="btn btn-secondary">
            🏦 + Nova Conta
          </button>
          <button onClick={iniciarCriacaoRecorrente} className="btn btn-secondary">
            📋 + Empréstimo / Recorrência
          </button>
          <button onClick={() => setModalContrachequeAberto(true)} className="btn btn-secondary">
            📄 Importar Contracheque
          </button>
          <button onClick={() => setModalDocAberto(true)} className="btn btn-primary">
            💳 Importar Fatura / Extrato (IA)
          </button>
        </div>
      </div>

      {/* Gráfico Mensal de Fluxo de Caixa (Entradas vs Saídas) */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>📊 Fluxo de Caixa Mensal (Entradas vs Saídas)</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
              Comparativo consolidado dos últimos meses no schema <code>familialm</code>.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--cor-sucesso)' }} />
              Entradas (Receitas)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--cor-perigo)' }} />
              Saídas (Despesas)
            </span>
          </div>
        </div>

        {/* Gráfico de Barras Responsivo em Vanilla CSS */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '16px', height: '200px', paddingTop: '24px', borderBottom: '1px solid var(--borda)' }}>
          {dadosGrafico.map((mes) => {
            const alturaRec = Math.max((mes.receitas / maxValorGrafico) * 160, mes.receitas > 0 ? 6 : 0)
            const alturaDesp = Math.max((mes.despesas / maxValorGrafico) * 160, mes.despesas > 0 ? 6 : 0)

            return (
              <div key={mes.chave} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '160px', width: '100%', maxWidth: '64px', justifyContent: 'center' }}>
                  {/* Barra de Receitas */}
                  <div
                    title={`Receitas: R$ ${mes.receitas.toFixed(2)}`}
                    style={{
                      width: '24px',
                      height: `${alturaRec}px`,
                      backgroundColor: 'var(--cor-sucesso)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                  {/* Barra de Despesas */}
                  <div
                    title={`Despesas: R$ ${mes.despesas.toFixed(2)}`}
                    style={{
                      width: '24px',
                      height: `${alturaDesp}px`,
                      backgroundColor: 'var(--cor-perigo)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--texto-secundario)' }}>
                  {mes.rotulo}
                </span>
              </div>
            )
          })}
        </div>

        {/* Resumo Numérico sob o Gráfico */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px', flexWrap: 'wrap', gap: '12px', textAlign: 'center' }}>
          {dadosGrafico.map((mes) => (
            <div key={mes.chave} style={{ fontSize: '0.75rem' }}>
              <div style={{ color: 'var(--texto-secundario)', fontWeight: 500 }}>{mes.rotulo}</div>
              <div style={{ color: 'var(--cor-sucesso)', fontWeight: 600 }}>+R$ {mes.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
              <div style={{ color: 'var(--cor-perigo)', fontWeight: 600 }}>-R$ {mes.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Seção 1: Minhas Contas Bancárias & Carteiras */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Minhas Contas & Carteiras</h2>
          <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)' }}>
            Saldo Consolidado: <strong>R$ {contas.reduce((acc, c) => acc + Number(c.saldo_atual || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
          </span>
        </div>

        {contas.length === 0 && !carregando ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '24px' }}>
            Nenhuma conta bancária cadastrada. Clique em "+ Nova Conta" para começar.
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

      {/* Seção 2: Empréstimos & Despesas Recorrentes (com Controle de Quitação e Parcelas) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Empréstimos & Despesas Recorrentes</h2>
          <button
            type="button"
            onClick={iniciarCriacaoRecorrente}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.825rem' }}
          >
            📋 + Cadastrar Empréstimo
          </button>
        </div>

        {recorrentes.length === 0 && !carregando ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhum empréstimo ou despesa recorrente cadastrada. Clique em "+ Cadastrar Empréstimo" para controlar parcelas e amortização.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {recorrentes.map((rec) => {
              const isEmprestimo = rec.tipo === 'emprestimo' || rec.tipo === 'financiamento'
              const totalParc = rec.total_parcelas || 0
              const pagas = rec.parcelas_pagas || 0
              const porcentagem = totalParc > 0 ? Math.min(Math.round((pagas / totalParc) * 100), 100) : 0
              const contaVinculada = contas.find((c) => c.id === rec.conta_padrao_id)

              return (
                <div key={rec.id} className="card" style={{ borderLeft: isEmprestimo ? '4px solid var(--cor-alerta)' : '4px solid var(--cor-primaria)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '1rem' }}>{rec.nome}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                        {contaVinculada ? `Débito em: ${contaVinculada.nome}` : 'Sem débito automático'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className={`badge ${isEmprestimo ? 'badge-warning' : 'badge-primary'}`}>
                        {rec.tipo.toUpperCase()}
                      </span>
                      <button
                        type="button"
                        onClick={() => iniciarEdicaoRecorrente(rec)}
                        className="btn btn-secondary"
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirRecorrente(rec.id, rec.nome)}
                        className="btn btn-secondary"
                        style={{ padding: '2px 6px', fontSize: '0.75rem', color: 'var(--cor-perigo)' }}
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Valor da Parcela</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cor-perigo)' }}>
                        R$ {Number(rec.valor_parcela).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Vencimento</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Todo dia {rec.dia_vencimento}</div>
                    </div>
                  </div>

                  {isEmprestimo && totalParc > 0 && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--borda)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                        <span>
                          Parcelas: <strong>{pagas} de {totalParc} pagas</strong>
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--cor-primaria)' }}>{porcentagem}%</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--raio-full)', overflow: 'hidden' }}>
                        <div style={{ width: `${porcentagem}%`, height: '100%', backgroundColor: 'var(--cor-sucesso)', borderRadius: 'var(--raio-full)' }} />
                      </div>

                      {rec.saldo_devedor_total !== null && rec.saldo_devedor_total !== undefined && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '8px' }}>
                          <span>Saldo Devedor Restante:</span>
                          <strong>R$ {Number(rec.saldo_devedor_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => quitarParcelaManual(rec)}
                      className="btn btn-secondary"
                      style={{ width: '100%', fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      ✓ Registrar Pagamento da Parcela {pagas + 1}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Seção 3: Cofrinhos / Metas da Família (com Criar, Editar, Excluir, Aportar e Resgatar) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Cofrinhos & Metas da Família</h2>
          <button
            type="button"
            onClick={iniciarCriacaoCofrinho}
            className="btn btn-secondary"
            style={{ padding: '6px 14px', fontSize: '0.825rem' }}
          >
            🐷 + Novo Cofrinho
          </button>
        </div>

        {cofrinhos.length === 0 && !carregando ? (
          <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhum cofrinho cadastrado ainda. Clique em "🐷 + Novo Cofrinho" para criar metas como Férias, Reserva de Emergência, etc.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {cofrinhos.map((cofre) => {
              const porcentagem = Math.min(Math.round((cofre.saldo_atual / cofre.meta_valor) * 100), 100)
              return (
                <div key={cofre.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{cofre.nome}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-primary">{porcentagem}%</span>
                      <button
                        type="button"
                        onClick={() => iniciarEdicaoCofrinho(cofre)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        title="Editar cofrinho"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirCofrinho(cofre.id, cofre.nome)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--cor-perigo)' }}
                        title="Excluir cofrinho"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                    R$ {Number(cofre.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                    <span style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', fontWeight: 400 }}>
                      de R$ {Number(cofre.meta_valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {cofre.data_limite && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>
                      Meta para: {cofre.data_limite}
                    </div>
                  )}

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
        )}
      </div>

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

      {/* Lista de Transações com Paginação de 20 por página */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Transações e Contas</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
              Mostrando {transacoes.length > 0 ? indiceInicio + 1 : 0} a {Math.min(indiceInicio + ITENS_POR_PAGINA, transacoes.length)} de {transacoes.length} lançamentos.
            </p>
          </div>

          {/* Controles de Paginação no topo da tabela */}
          {totalPaginas > 1 && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                ◀ Anterior
              </button>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {paginaAtual} / {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual >= totalPaginas}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
              >
                Próxima ▶
              </button>
            </div>
          )}
        </div>

        {transacoes.length === 0 && !carregando ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhuma transação financeira registrada no banco ainda.
          </div>
        ) : (
          <>
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
                  {transacoesPaginadas.map((t) => {
                    const contaVinculada = contas.find((c) => c.id === t.conta_id)
                    const isRecorrente = Boolean(t.recorrencia_id)

                    return (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 500 }}>
                          {isRecorrente && <span className="badge badge-warning" style={{ marginRight: '6px' }}>Recorrente</span>}
                          {t.descricao}
                          {t.comprovante_url && (
                            <a
                              href={t.comprovante_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary"
                              style={{ padding: '2px 6px', fontSize: '0.7rem', marginLeft: '8px', display: 'inline-flex', alignItems: 'center', gap: '2px', textDecoration: 'none' }}
                              title="Visualizar documento ou comprovante original"
                            >
                              📄 Anexo
                            </a>
                          )}
                        </td>
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

            {/* Controles de Paginação no rodapé */}
            {totalPaginas > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--borda)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)' }}>
                  Página {paginaAtual} de {totalPaginas}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual === 1}
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                  >
                    ◀ Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual >= totalPaginas}
                    className="btn btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                  >
                    Próxima ▶
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Criação / Edição de Empréstimo ou Recorrência */}
      {modalRecorrenteAberto && (
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {recorrenteEditando ? '✏️ Editar Empréstimo / Recorrência' : '📋 Novo Empréstimo / Recorrência'}
              </h2>
              <button
                type="button"
                onClick={() => setModalRecorrenteAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarRecorrente} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Identificação do Empréstimo / Despesa</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: Empréstimo Pessoal Nubank, Financiamento Imobiliário"
                  value={nomeRec}
                  onChange={(e) => setNomeRec(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Tipo de Recorrência</label>
                  <select
                    className="input"
                    value={tipoRec}
                    onChange={(e) => setTipoRec(e.target.value as any)}
                  >
                    <option value="emprestimo">Empréstimo</option>
                    <option value="financiamento">Financiamento</option>
                    <option value="despesa_fixa">Despesa Fixa (ex: Aluguel)</option>
                    <option value="assinatura">Assinatura</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Valor da Parcela (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="650.00"
                    value={valorParcelaRec}
                    onChange={(e) => setValorParcelaRec(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Dia do Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="input"
                    value={diaVencimentoRec}
                    onChange={(e) => setDiaVencimentoRec(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Total de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    placeholder="Ex: 36"
                    value={totalParcelasRec}
                    onChange={(e) => setTotalParcelasRec(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Parcelas Pagas</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={parcelasPagasRec}
                    onChange={(e) => setParcelasPagasRec(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Saldo Devedor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input"
                    placeholder="Ex: 15400.00"
                    value={saldoDevedorRec}
                    onChange={(e) => setSaldoDevedorRec(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Conta de Débito Padrão</label>
                  <select
                    className="input"
                    value={contaPadraoRecId}
                    onChange={(e) => setContaPadraoRecId(e.target.value)}
                  >
                    <option value="">Nenhuma conta padrão</option>
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Palavras-chave no Extrato (para Conciliação Automática)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: EMP NUBANK, DEB EMPRESTIMO, PARC EMP"
                  value={palavrasChaveRec}
                  onChange={(e) => setPalavrasChaveRec(e.target.value)}
                />
                <span style={{ fontSize: '0.725rem', color: 'var(--texto-secundario)', marginTop: '4px', display: 'block' }}>
                  A IA usará esses termos para identificar e abater as parcelas ao importar extratos bancários.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalRecorrenteAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoRecorrente}>
                  {salvandoRecorrente ? 'Salvando...' : recorrenteEditando ? 'Salvar Alterações' : 'Cadastrar Compromisso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Criação / Edição de Cofrinho */}
      {modalCofrinhoCriarAberto && (
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
          <div className="card" style={{ width: '100%', maxWidth: '480px', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {cofrinhoEditando ? '✏️ Editar Cofrinho' : '🐷 Novo Cofrinho / Meta'}
              </h2>
              <button
                type="button"
                onClick={() => setModalCofrinhoCriarAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarCofrinho} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome do Cofrinho</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ex: 🏖️ Férias de Verão, 🚗 Carro Novo, 🛡️ Reserva"
                  value={nomeCofrinho}
                  onChange={(e) => setNomeCofrinho(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Meta de Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className="input"
                    placeholder="10000.00"
                    value={metaCofrinho}
                    onChange={(e) => setMetaCofrinho(e.target.value)}
                    required
                  />
                </div>

                {!cofrinhoEditando && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Saldo Inicial (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="0.00"
                      value={saldoInicialCofrinho}
                      onChange={(e) => setSaldoInicialCofrinho(e.target.value)}
                    />
                  </div>
                )}

                {cofrinhoEditando && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Ícone / Emoji</label>
                    <input
                      type="text"
                      className="input"
                      value={iconeCofrinho}
                      onChange={(e) => setIconeCofrinho(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Data Limite / Prazo (Opcional)</label>
                <input
                  type="date"
                  className="input"
                  value={dataLimiteCofrinho}
                  onChange={(e) => setDataLimiteCofrinho(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" onClick={() => setModalCofrinhoCriarAberto(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvandoCofrinho}>
                  {salvandoCofrinho ? 'Salvando...' : cofrinhoEditando ? 'Salvar Alterações' : 'Criar Cofrinho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              Cofrinho: <strong>{cofrinhoOperacao.cofre.nome}</strong> (Saldo: R$ {Number(cofrinhoOperacao.cofre.saldo_atual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
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

      {/* Modal de Importação de Fatura de Cartão / Extrato Bancário (IA) */}
      {modalDocAberto && (
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
          <div className="card" style={{ width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>💳 Importar Extrato Bancário ou Fatura</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                  Conciliação automática de débitos de empréstimos e compras individuais via Gemini 4 Argon.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalDocAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Selecione o arquivo da fatura ou extrato (PDF, PNG ou JPEG):</label>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                className="input"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setArquivoDoc(e.target.files[0])
                    setDadosDoc(null)
                  }
                }}
              />
            </div>

            {arquivoDoc && !dadosDoc && (
              <button
                type="button"
                onClick={analisarDocumentoIA}
                className="btn btn-primary"
                style={{ width: '100%', marginBottom: '16px' }}
                disabled={analisandoDoc}
              >
                {analisandoDoc ? 'Extraindo lançamentos e conciliando empréstimos com Gemini 4 Argon... 🧠' : '✨ Extrair e Conciliar com IA'}
              </button>
            )}

            {dadosDoc && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div style={{ padding: '12px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Tipo Detectado</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'capitalize' }}>
                      {dadosDoc.tipo_documento === 'fatura_cartao' ? '💳 Fatura de Cartão' : '🏦 Extrato Bancário'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Instituição / Banco</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{dadosDoc.instituicao || 'Identificada'}</div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>
                      {dadosDoc.tipo_documento === 'fatura_cartao' ? 'Vencimento da Fatura' : 'Período'}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {dadosDoc.data_vencimento_fatura || dadosDoc.periodo_referencia || 'N/A'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', borderRadius: 'var(--raio-md)', backgroundColor: 'var(--bg-hover)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)' }}>Valor Total</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--cor-primaria)' }}>
                      R$ {Number(dadosDoc.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Vincular estas movimentações a qual Conta Bancária / Cartão?</label>
                  <select
                    className="input"
                    value={contaDocId}
                    onChange={(e) => setContaDocId(e.target.value)}
                  >
                    <option value="">Selecione uma conta (opcional)</option>
                    {contas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} (Saldo: R$ {Number(c.saldo_atual || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lista de Transações com Seleção Individual e Destaque de Conciliação */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      Transações Extraídas ({transacoesSelecionadas.length} de {dadosDoc.transacoes.length} selecionadas):
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (transacoesSelecionadas.length === dadosDoc.transacoes.length) {
                          setTransacoesSelecionadas([])
                        } else {
                          setTransacoesSelecionadas(dadosDoc.transacoes.map((_, i) => i))
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--cor-primaria)', fontSize: '0.8rem', cursor: 'pointer' }}
                    >
                      {transacoesSelecionadas.length === dadosDoc.transacoes.length ? 'Desmarcar todas' : 'Marcar todas'}
                    </button>
                  </div>

                  <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--borda)', borderRadius: 'var(--raio-md)' }}>
                    <table className="tabela" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>✓</th>
                          <th>Data</th>
                          <th>Lançamento / Estabelecimento</th>
                          <th>Tipo</th>
                          <th style={{ textAlign: 'right' }}>Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dadosDoc.transacoes.map((t, idx) => {
                          const selecionado = transacoesSelecionadas.includes(idx)
                          const conciliado = Boolean(t.recorrencia_id)

                          return (
                            <tr
                              key={idx}
                              onClick={() => toggleTransacaoSelecionada(idx)}
                              style={{
                                cursor: 'pointer',
                                backgroundColor: conciliado
                                  ? 'var(--cor-alerta-suave)'
                                  : selecionado
                                  ? 'var(--cor-primaria-suave)'
                                  : 'inherit',
                              }}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={selecionado}
                                  onChange={() => {}}
                                  style={{ cursor: 'pointer' }}
                                />
                              </td>
                              <td>{t.data || '-'}</td>
                              <td style={{ fontWeight: 500 }}>
                                {conciliado && <span className="badge badge-warning" style={{ marginRight: '6px' }}>Conciliado</span>}
                                {t.descricao}
                              </td>
                              <td>
                                <span className={`badge ${t.tipo === 'receita' ? 'badge-success' : 'badge-danger'}`}>
                                  {t.tipo}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                R$ {Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={salvarDocumentoFinal}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '8px' }}
                  disabled={salvandoDoc || transacoesSelecionadas.length === 0}
                >
                  {salvandoDoc
                    ? 'Salvando no banco e arquivando no Storage...'
                    : `💾 Confirmar e Inserir ${transacoesSelecionadas.length} Transações no Financeiro`}
                </button>
              </div>
            )}
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
    </div>
  )
}
