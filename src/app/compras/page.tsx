'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useFamilia } from '@/lib/tenant/FamiliaContext'

interface ItemCompra {
  id: string
  recibo_id: string
  familia_id?: string
  codigo_produto?: string | null
  nome_produto: string
  quantidade: number
  valor_unitario: number
  categoria_sugerida?: string
}

interface Recibo {
  id: string
  familia_id?: string
  fornecedor?: string
  data_compra?: string
  valor_total: number
  caminho_imagem_recibo?: string
  criado_em?: string
  itens?: ItemCompra[]
}

interface ItemExtraidoIA {
  selecionado: boolean
  codigo_produto?: string
  nome_produto: string
  quantidade: number
  valor_unitario: number
  categoria_sugerida: string
}

function normalizarFornecedor(fornecedor?: string | null): string {
  return (fornecedor || '').trim().replace(/\s+/g, ' ').toUpperCase()
}

function normalizarCodigoProduto(codigo?: string | null): string {
  const limpo = (codigo || '').trim().replace(/\s+/g, '').toUpperCase()
  if (!limpo || limpo === 'NULL') return ''
  const semZeros = limpo.replace(/^0+(?=\d)/, '')
  return semZeros || limpo
}

const CATEGORIAS_COMPRAS = [
  'Alimentação',
  'Hortifruti',
  'Carnes & Frios',
  'Laticínios',
  'Bebidas',
  'Padaria',
  'Limpeza',
  'Higiene',
  'Farmácia',
  'Pet',
  'Utilidades',
  'Geral',
]

export default function ComprasPage() {
  const { familiaId } = useFamilia()

  const [recibos, setRecibos] = useState<Recibo[]>([])
  const [itensPorRecibo, setItensPorRecibo] = useState<Record<string, ItemCompra[]>>({})
  const [recibosExpandidos, setRecibosExpandidos] = useState<Record<string, boolean>>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')

  // Campos do formulário manual rápido
  const [fornecedor, setFornecedor] = useState('')
  const [dataCompraManual, setDataCompraManual] = useState('')
  const [valorTotal, setValorTotal] = useState('')
  const [arquivoRecibo, setArquivoRecibo] = useState<File | null>(null)
  const [itensManuais, setItensManuais] = useState<ItemExtraidoIA[]>([])

  // Modal de Importação de Nota Fiscal com IA
  const [modalIaAberto, setModalIaAberto] = useState(false)
  const [arquivoIa, setArquivoIa] = useState<File | null>(null)
  const [analisandoIa, setAnalisandoIa] = useState(false)
  const [erroIa, setErroIa] = useState<string | null>(null)
  const [iaFornecedor, setIaFornecedor] = useState('')
  const [iaDataCompra, setIaDataCompra] = useState('')
  const [iaValorTotal, setIaValorTotal] = useState('')
  const [iaItens, setIaItens] = useState<ItemExtraidoIA[]>([])
  const [lancarEmFinancas, setLancarEmFinancas] = useState(true)
  const [salvandoIa, setSalvandoIa] = useState(false)

  // Adicionar item avulso em recibo já existente
  const [reciboAdicionandoItem, setReciboAdicionandoItem] = useState<string | null>(null)
  const [novoItemCodigo, setNovoItemCodigo] = useState('')
  const [novoItemNome, setNovoItemNome] = useState('')
  const [novoItemQtd, setNovoItemQtd] = useState('1')
  const [novoItemValor, setNovoItemValor] = useState('')
  const [novoItemCat, setNovoItemCat] = useState('Alimentação')

  // Edição inline de item já salvo
  const [itemEditandoId, setItemEditandoId] = useState<string | null>(null)
  const [editItemCodigo, setEditItemCodigo] = useState('')
  const [editItemNome, setEditItemNome] = useState('')
  const [editItemQtd, setEditItemQtd] = useState('1')
  const [editItemValor, setEditItemValor] = useState('0')
  const [editItemCat, setEditItemCat] = useState('Alimentação')

  const sincronizarItemNoCatalogo = async (
    fornecedorNome: string | undefined | null,
    codigoProduto: string | undefined | null,
    nomeProduto: string,
    categoriaSugerida: string | undefined | null,
    valorUnitario: number
  ) => {
    const codNorm = normalizarCodigoProduto(codigoProduto)
    const fornLimpo = (fornecedorNome || '').trim() || 'Supermercado'
    const fornNorm = normalizarFornecedor(fornLimpo)
    if (!codNorm || !fornNorm || !nomeProduto.trim()) return

    try {
      const { data: existentes } = await supabase
        .from('compras_catalogo_produtos')
        .select('id')
        .eq('familia_id', familiaId)
        .eq('fornecedor_normalizado', fornNorm)
        .eq('codigo_produto', codNorm)

      if (existentes && existentes.length > 0) {
        await supabase
          .from('compras_catalogo_produtos')
          .update({
            fornecedor: fornLimpo,
            nome_produto: nomeProduto.trim(),
            categoria_sugerida: (categoriaSugerida || 'Alimentação').trim() || 'Alimentação',
            ultimo_valor_unitario: Number(valorUnitario) || 0,
            atualizado_em: new Date().toISOString(),
          })
          .eq('id', existentes[0].id)
      } else {
        await supabase.from('compras_catalogo_produtos').insert([
          {
            id: crypto.randomUUID(),
            familia_id: familiaId,
            fornecedor: fornLimpo,
            fornecedor_normalizado: fornNorm,
            codigo_produto: codNorm,
            nome_produto: nomeProduto.trim(),
            categoria_sugerida: (categoriaSugerida || 'Alimentação').trim() || 'Alimentação',
            ultimo_valor_unitario: Number(valorUnitario) || 0,
          },
        ])
      }
    } catch {}
  }

  const reconciliarItensComCatalogo = async (
    fornecedorNome: string,
    itens: ItemExtraidoIA[]
  ): Promise<ItemExtraidoIA[]> => {
    if (!itens.length) return itens
    try {
      const { data: catalogo } = await supabase
        .from('compras_catalogo_produtos')
        .select('fornecedor_normalizado,fornecedor,codigo_produto,nome_produto,categoria_sugerida')
        .eq('familia_id', familiaId)

      if (!catalogo || !catalogo.length) return itens

      const fornRecibo = normalizarFornecedor(fornecedorNome)
      const mapaExato = new Map<string, any>()
      const mapaPorCodigo = new Map<string, any[]>()

      for (const reg of catalogo) {
        const fCat = normalizarFornecedor(reg.fornecedor_normalizado || reg.fornecedor)
        const cRaw = String(reg.codigo_produto || '').trim().toUpperCase()
        const cNorm = normalizarCodigoProduto(cRaw)
        if (!cNorm) continue
        mapaExato.set(`${fCat}::${cRaw}`, reg)
        mapaExato.set(`${fCat}::${cNorm}`, reg)
        if (!mapaPorCodigo.has(cRaw)) mapaPorCodigo.set(cRaw, [])
        mapaPorCodigo.get(cRaw)!.push({ fCat, reg })
        if (cNorm !== cRaw) {
          if (!mapaPorCodigo.has(cNorm)) mapaPorCodigo.set(cNorm, [])
          mapaPorCodigo.get(cNorm)!.push({ fCat, reg })
        }
      }

      return itens.map(item => {
        const codNorm = normalizarCodigoProduto(item.codigo_produto)
        if (!codNorm) return item
        const codUpper = String(item.codigo_produto || '').trim().toUpperCase()

        let match =
          mapaExato.get(`${fornRecibo}::${codUpper}`) ||
          mapaExato.get(`${fornRecibo}::${codNorm}`)

        if (!match && fornRecibo) {
          const candidatos =
            mapaPorCodigo.get(codUpper) || mapaPorCodigo.get(codNorm) || []
          const achado = candidatos.find(
            c => c.fCat && (c.fCat.includes(fornRecibo) || fornRecibo.includes(c.fCat))
          )
          if (achado) match = achado.reg
        }

        if (match && match.nome_produto) {
          return {
            ...item,
            codigo_produto: codNorm,
            nome_produto: String(match.nome_produto).trim(),
            categoria_sugerida: String(match.categoria_sugerida || item.categoria_sugerida || 'Alimentação'),
          }
        }
        return { ...item, codigo_produto: codNorm }
      })
    } catch {
      return itens
    }
  }

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const [{ data: recibosData }, { data: itensData }] = await Promise.all([
        supabase
          .from('compras_recibos')
          .select('*')
          .eq('familia_id', familiaId)
          .order('criado_em', { ascending: false }),
        supabase
          .from('compras_itens_extraidos')
          .select('*')
          .eq('familia_id', familiaId),
      ])

      const mapaItens: Record<string, ItemCompra[]> = {}
      if (itensData) {
        for (const item of itensData as ItemCompra[]) {
          if (!mapaItens[item.recibo_id]) {
            mapaItens[item.recibo_id] = []
          }
          mapaItens[item.recibo_id].push(item)
        }
      }
      setItensPorRecibo(mapaItens)

      if (recibosData) {
        setRecibos(recibosData as Recibo[])
        if (recibosData.length > 0 && mapaItens[recibosData[0].id]?.length) {
          setRecibosExpandidos(prev => ({ ...prev, [recibosData[0].id]: true }))
        }
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    const hoje = new Date().toISOString().split('T')[0]
    setDataCompraManual(prev => prev || hoje)
    setIaDataCompra(prev => prev || hoje)
  }, [])

  useEffect(() => {
    if (familiaId) {
      carregarDados()
    }
  }, [familiaId])

  const uploadImagemRecibo = async (file: File | null): Promise<string | null> => {
    if (!file) return null
    try {
      const nomeArquivo = `recibos/${familiaId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: upErr } = await supabase.storage
        .from('familia-os-recibos')
        .upload(nomeArquivo, file, { upsert: true })

      if (!upErr) {
        const { data: pUrl } = supabase.storage
          .from('familia-os-recibos')
          .getPublicUrl(nomeArquivo)
        return pUrl.publicUrl
      }
    } catch {}
    return null
  }

  const handleExtrairComIA = async (fileParaAnalisar?: File | null) => {
    const targetFile = fileParaAnalisar || arquivoIa
    if (!targetFile) {
      setErroIa('Selecione uma foto ou PDF da nota fiscal para analisar.')
      return
    }

    setAnalisandoIa(true)
    setErroIa(null)
    try {
      const formData = new FormData()
      formData.append('file', targetFile)
      formData.append('familia_id', familiaId)

      const res = await fetch(`/api/ocr/receipt?familia_id=${encodeURIComponent(familiaId)}`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao extrair dados da nota com a IA.')
      }

      const fornExtraido = data.fornecedor || 'Supermercado / Estabelecimento'
      setIaFornecedor(fornExtraido)
      setIaDataCompra(data.data_compra || new Date().toISOString().split('T')[0])

      const itensExtraidosBrutos: ItemExtraidoIA[] = Array.isArray(data.itens)
        ? data.itens.map((it: any) => ({
            selecionado: true,
            codigo_produto: normalizarCodigoProduto(it.codigo_produto),
            nome_produto: String(it.nome_produto || 'Item'),
            quantidade: Number(it.quantidade) > 0 ? Number(it.quantidade) : 1,
            valor_unitario: Number(it.valor_unitario) || 0,
            categoria_sugerida: String(it.categoria_sugerida || 'Alimentação'),
          }))
        : []

      const itensExtraidos = await reconciliarItensComCatalogo(fornExtraido, itensExtraidosBrutos)
      setIaItens(itensExtraidos)

      const somaItens = itensExtraidos.reduce(
        (acc, it) => acc + it.quantidade * it.valor_unitario,
        0
      )
      const totalExtraido =
        Number(data.valor_total) > 0
          ? Number(data.valor_total)
          : Number(somaItens.toFixed(2))
      setIaValorTotal(totalExtraido > 0 ? totalExtraido.toFixed(2) : '')
    } catch (err: any) {
      setErroIa(err.message || 'Erro ao analisar nota fiscal.')
    } finally {
      setAnalisandoIa(false)
    }
  }

  const handleConfirmarImportacaoIA = async () => {
    if (!iaFornecedor.trim()) {
      setErroIa('Informe o nome do estabelecimento / fornecedor.')
      return
    }

    const itensSelecionados = iaItens.filter(
      it => it.selecionado && it.nome_produto.trim() !== ''
    )
    const somaCalculada = itensSelecionados.reduce(
      (acc, it) => acc + Number(it.quantidade || 1) * Number(it.valor_unitario || 0),
      0
    )
    const valorFinal = parseFloat(iaValorTotal) > 0 ? parseFloat(iaValorTotal) : somaCalculada

    setSalvandoIa(true)
    setErroIa(null)
    try {
      const urlImagem = await uploadImagemRecibo(arquivoIa)
      const reciboId = crypto.randomUUID()

      const novoRecibo = {
        id: reciboId,
        familia_id: familiaId,
        fornecedor: iaFornecedor.trim(),
        valor_total: Number(valorFinal.toFixed(2)),
        data_compra: iaDataCompra || new Date().toISOString().split('T')[0],
        caminho_imagem_recibo: urlImagem,
      }

      const { error: errRecibo } = await supabase
        .from('compras_recibos')
        .insert([novoRecibo])
      if (errRecibo) throw errRecibo

      if (itensSelecionados.length > 0) {
        const payloadItens = itensSelecionados.map(it => ({
          id: crypto.randomUUID(),
          recibo_id: reciboId,
          familia_id: familiaId,
          codigo_produto: normalizarCodigoProduto(it.codigo_produto) || null,
          nome_produto: it.nome_produto.trim(),
          quantidade: Number(it.quantidade) || 1,
          valor_unitario: Number(it.valor_unitario) || 0,
          categoria_sugerida: it.categoria_sugerida || 'Geral',
        }))

        const { error: errItens } = await supabase
          .from('compras_itens_extraidos')
          .insert(payloadItens)
        if (errItens) throw errItens

        for (const it of itensSelecionados) {
          if (it.codigo_produto && it.codigo_produto.trim()) {
            await sincronizarItemNoCatalogo(
              iaFornecedor.trim(),
              it.codigo_produto,
              it.nome_produto,
              it.categoria_sugerida,
              Number(it.valor_unitario) || 0
            )
          }
        }
      }

      if (lancarEmFinancas && valorFinal > 0) {
        await supabase.from('transacoes_financeiras').insert([
          {
            id: crypto.randomUUID(),
            familia_id: familiaId,
            descricao: `Compra (${itensSelecionados.length} itens) - ${iaFornecedor.trim()}`,
            tipo: 'despesa_variavel',
            valor: Number(valorFinal.toFixed(2)),
            data_vencimento: iaDataCompra || new Date().toISOString().split('T')[0],
            status: 'pago',
            comprovante_url: urlImagem,
          },
        ])
      }

      setModalIaAberto(false)
      setArquivoIa(null)
      setIaFornecedor('')
      setIaValorTotal('')
      setIaItens([])
      await carregarDados()
      setRecibosExpandidos(prev => ({ ...prev, [reciboId]: true }))
    } catch (err: any) {
      setErroIa('Erro ao salvar nota: ' + (err.message || String(err)))
    } finally {
      setSalvandoIa(false)
    }
  }

  const handleSalvarReciboManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fornecedor || !valorTotal || salvando) return

    setSalvando(true)
    try {
      const urlImagem = await uploadImagemRecibo(arquivoRecibo)
      const reciboId = crypto.randomUUID()

      const novo = {
        id: reciboId,
        familia_id: familiaId,
        fornecedor: fornecedor.trim(),
        valor_total: parseFloat(valorTotal),
        data_compra: dataCompraManual || new Date().toISOString().split('T')[0],
        caminho_imagem_recibo: urlImagem,
      }

      const { error } = await supabase.from('compras_recibos').insert([novo])
      if (error) throw error

      const itensValidos = itensManuais.filter(it => it.nome_produto.trim() !== '')
      if (itensValidos.length > 0) {
        const payloadItens = itensValidos.map(it => ({
          id: crypto.randomUUID(),
          recibo_id: reciboId,
          familia_id: familiaId,
          codigo_produto: normalizarCodigoProduto(it.codigo_produto) || null,
          nome_produto: it.nome_produto.trim(),
          quantidade: Number(it.quantidade) || 1,
          valor_unitario: Number(it.valor_unitario) || 0,
          categoria_sugerida: it.categoria_sugerida || 'Geral',
        }))
        await supabase.from('compras_itens_extraidos').insert(payloadItens)

        for (const it of itensValidos) {
          if (it.codigo_produto && it.codigo_produto.trim()) {
            await sincronizarItemNoCatalogo(
              fornecedor.trim(),
              it.codigo_produto,
              it.nome_produto,
              it.categoria_sugerida,
              Number(it.valor_unitario) || 0
            )
          }
        }
      }

      setFornecedor('')
      setValorTotal('')
      setArquivoRecibo(null)
      setItensManuais([])
      await carregarDados()
      if (itensValidos.length > 0) {
        setRecibosExpandidos(prev => ({ ...prev, [reciboId]: true }))
      }
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  const adicionarItemEmReciboExistente = async (reciboId: string) => {
    if (!novoItemNome.trim()) return
    const qtd = parseFloat(novoItemQtd) || 1
    const val = parseFloat(novoItemValor) || 0
    const codNorm = normalizarCodigoProduto(novoItemCodigo) || null
    const reciboAlvo = recibos.find(r => r.id === reciboId)

    try {
      const novoItem = {
        id: crypto.randomUUID(),
        recibo_id: reciboId,
        familia_id: familiaId,
        codigo_produto: codNorm,
        nome_produto: novoItemNome.trim(),
        quantidade: qtd,
        valor_unitario: val,
        categoria_sugerida: novoItemCat,
      }
      const { error } = await supabase.from('compras_itens_extraidos').insert([novoItem])
      if (error) throw error

      if (codNorm) {
        await sincronizarItemNoCatalogo(
          reciboAlvo?.fornecedor,
          codNorm,
          novoItemNome.trim(),
          novoItemCat,
          val
        )
      }

      setNovoItemCodigo('')
      setNovoItemNome('')
      setNovoItemQtd('1')
      setNovoItemValor('')
      setReciboAdicionandoItem(null)
      await carregarDados()
    } catch (err: any) {
      alert('Erro ao adicionar item: ' + err.message)
    }
  }

  const excluirItemRecibo = async (itemId: string) => {
    try {
      await supabase.from('compras_itens_extraidos').delete().eq('id', itemId)
      await carregarDados()
    } catch (err) {
      console.error(err)
    }
  }

  const iniciarEdicaoItem = (item: ItemCompra) => {
    setItemEditandoId(item.id)
    setEditItemCodigo(item.codigo_produto || '')
    setEditItemNome(item.nome_produto)
    setEditItemQtd(String(item.quantidade || 1))
    setEditItemValor(String(item.valor_unitario || 0))
    setEditItemCat(item.categoria_sugerida || 'Alimentação')
  }

  const salvarEdicaoItem = async (item: ItemCompra) => {
    if (!editItemNome.trim()) return
    const qtd = parseFloat(editItemQtd) || 1
    const val = parseFloat(editItemValor) || 0
    const codNorm = normalizarCodigoProduto(editItemCodigo) || null
    const reciboOrigem = recibos.find(r => r.id === item.recibo_id)
    try {
      const { error } = await supabase
        .from('compras_itens_extraidos')
        .update({
          codigo_produto: codNorm,
          nome_produto: editItemNome.trim(),
          quantidade: qtd,
          valor_unitario: val,
          categoria_sugerida: editItemCat || 'Geral',
        })
        .eq('id', item.id)
      if (error) throw error

      if (codNorm) {
        await sincronizarItemNoCatalogo(
          reciboOrigem?.fornecedor,
          codNorm,
          editItemNome.trim(),
          editItemCat,
          val
        )
      }

      const { data: itensAtualizados } = await supabase
        .from('compras_itens_extraidos')
        .select('quantidade, valor_unitario')
        .eq('recibo_id', item.recibo_id)
      if (itensAtualizados && itensAtualizados.length > 0) {
        const novoTotal = itensAtualizados.reduce(
          (acc, it: any) => acc + Number(it.quantidade || 1) * Number(it.valor_unitario || 0),
          0
        )
        await supabase
          .from('compras_recibos')
          .update({ valor_total: Number(novoTotal.toFixed(2)) })
          .eq('id', item.recibo_id)
      }

      setItemEditandoId(null)
      await carregarDados()
    } catch (err: any) {
      alert('Erro ao atualizar item: ' + err.message)
    }
  }

  const excluirRecibo = async (id: string) => {
    if (!confirm('Deseja excluir esta nota fiscal e todos os seus itens?')) return
    try {
      await supabase.from('compras_itens_extraidos').delete().eq('recibo_id', id)
      await supabase.from('compras_recibos').delete().eq('id', id)
      setRecibos(prev => prev.filter(r => r.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const todosItensRegistrados = useMemo(() => {
    return Object.values(itensPorRecibo).flat()
  }, [itensPorRecibo])

  const totalGasto = useMemo(() => {
    return recibos.reduce((acc, r) => acc + Number(r.valor_total || 0), 0)
  }, [recibos])

  const recibosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return recibos
    return recibos.filter(r => {
      const matchFornecedor = (r.fornecedor || '').toLowerCase().includes(termo)
      const itens = itensPorRecibo[r.id] || []
      const matchItem = itens.some(
        it =>
          it.nome_produto.toLowerCase().includes(termo) ||
          (it.codigo_produto || '').toLowerCase().includes(termo) ||
          (it.categoria_sugerida || '').toLowerCase().includes(termo)
      )
      return matchFornecedor || matchItem
    })
  }, [recibos, itensPorRecibo, busca])

  return (
    <div>
      {/* Cabeçalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Compras Inteligentes & Notas Fiscais
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Importe a foto ou PDF da nota fiscal para a IA extrair e registrar todos os itens comprados automaticamente.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setErroIa(null)
            setModalIaAberto(true)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            border: 'none',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
          }}
        >
          🤖 Importar Nota Fiscal com IA (Foto / PDF)
        </button>
      </div>

      {/* Resumo Rápido */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total em Compras
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cor-sucesso)', marginTop: '6px' }}>
            R$ {totalGasto.toFixed(2)}
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', textTransform: 'uppercase', fontWeight: 600 }}>
            Notas Registradas
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '6px' }}>
            {recibos.length}
          </div>
        </div>

        <div className="card" style={{ padding: '18px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', textTransform: 'uppercase', fontWeight: 600 }}>
            Total de Itens Comprados
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', marginTop: '6px' }}>
            {todosItensRegistrados.length} itens
          </div>
        </div>
      </div>

      {/* Formulário Manual / Rápido */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>🧾 Registrar Nota Manualmente</h2>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            onClick={() =>
              setItensManuais(prev => [
                ...prev,
                {
                  selecionado: true,
                  nome_produto: '',
                  quantidade: 1,
                  valor_unitario: 0,
                  categoria_sugerida: 'Alimentação',
                },
              ])
            }
          >
            + Adicionar Item Manual na Nota
          </button>
        </div>

        <form onSubmit={handleSalvarReciboManual}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '14px',
              alignItems: 'flex-end',
            }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Supermercado / Loja</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Assaí Atacadista, Nazaré"
                value={fornecedor}
                onChange={e => setFornecedor(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Data da Compra</label>
              <input
                type="date"
                className="input"
                value={dataCompraManual}
                onChange={e => setDataCompraManual(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Valor Total (R$)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                placeholder="0.00"
                value={valorTotal}
                onChange={e => setValorTotal(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Foto / PDF do Cupom</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="input"
                style={{ padding: '7px 12px' }}
                onChange={e => {
                  const f = e.target.files?.[0] || null
                  setArquivoRecibo(f)
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {arquivoRecibo && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ height: '42px', whiteSpace: 'nowrap' }}
                  onClick={() => {
                    setArquivoIa(arquivoRecibo)
                    setModalIaAberto(true)
                    handleExtrairComIA(arquivoRecibo)
                  }}
                >
                  🤖 Extrair c/ IA
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={salvando}
                style={{ height: '42px', flex: 1 }}
              >
                {salvando ? 'Salvando...' : '+ Salvar Nota'}
              </button>
            </div>
          </div>

          {itensManuais.length > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--borda)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px', color: 'var(--texto-secundario)' }}>
                Itens desta compra ({itensManuais.length}):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {itensManuais.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 90px 120px 140px 40px',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="text"
                      className="input"
                      placeholder="Nome do produto (ex: Arroz 5kg)"
                      value={item.nome_produto}
                      onChange={e => {
                        const copia = [...itensManuais]
                        copia[idx].nome_produto = e.target.value
                        setItensManuais(copia)
                      }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="Qtd"
                      value={item.quantidade}
                      onChange={e => {
                        const copia = [...itensManuais]
                        copia[idx].quantidade = parseFloat(e.target.value) || 1
                        setItensManuais(copia)
                      }}
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="R$ Unit."
                      value={item.valor_unitario || ''}
                      onChange={e => {
                        const copia = [...itensManuais]
                        copia[idx].valor_unitario = parseFloat(e.target.value) || 0
                        setItensManuais(copia)
                      }}
                    />
                    <select
                      className="input"
                      value={item.categoria_sugerida}
                      onChange={e => {
                        const copia = [...itensManuais]
                        copia[idx].categoria_sugerida = e.target.value
                        setItensManuais(copia)
                      }}
                    >
                      {CATEGORIAS_COMPRAS.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setItensManuais(prev => prev.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Busca e Listagem de Notas + Itens */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
          Notas Fiscais e Itens Comprados
        </h2>
        <input
          type="text"
          className="input"
          placeholder="🔍 Buscar por produto comprado, categoria ou mercado..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ maxWidth: '380px' }}
        />
      </div>

      {recibosFiltrados.length === 0 && !carregando ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--texto-secundario)', padding: '32px' }}>
          Nenhuma nota fiscal encontrada. Clique em <strong>"Importar Nota Fiscal com IA"</strong> para extrair todos os itens de um cupom!
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {recibosFiltrados.map(r => {
            const itensDaNota = itensPorRecibo[r.id] || []
            const expandido = !!recibosExpandidos[r.id] || busca.trim().length > 0

            return (
              <div key={r.id} className="card" style={{ padding: '18px 20px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.14)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                      }}
                    >
                      🛒
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                        {r.fornecedor || 'Estabelecimento Comercial'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                        📅 {r.data_compra ? new Date(r.data_compra + 'T12:00:00').toLocaleDateString('pt-BR') : '-'} •{' '}
                        <strong style={{ color: '#38bdf8' }}>{itensDaNota.length} itens registrados</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--cor-sucesso)', marginRight: '8px' }}>
                      R$ {Number(r.valor_total).toFixed(2)}
                    </div>

                    {r.caminho_imagem_recibo && (
                      <a
                        href={r.caminho_imagem_recibo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', textDecoration: 'none' }}
                      >
                        🧾 Ver Nota Original
                      </a>
                    )}

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                      onClick={() =>
                        setRecibosExpandidos(prev => ({ ...prev, [r.id]: !expandido }))
                      }
                    >
                      {expandido ? '▲ Ocultar Itens' : `▼ Ver Itens (${itensDaNota.length})`}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                      onClick={() => {
                        setRecibosExpandidos(prev => ({ ...prev, [r.id]: true }))
                        setReciboAdicionandoItem(reciboAdicionandoItem === r.id ? null : r.id)
                      }}
                    >
                      + Item
                    </button>

                    <button
                      type="button"
                      onClick={() => excluirRecibo(r.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--cor-perigo)',
                        fontSize: '1rem',
                        padding: '4px 8px',
                      }}
                      title="Excluir nota e itens"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                  {/* Formulário para adicionar item avulso na nota */}
                {reciboAdicionandoItem === r.id && (
                  <div
                    style={{
                      marginTop: '14px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--borda)',
                      display: 'grid',
                      gridTemplateColumns: '120px 2fr 90px 110px 140px auto',
                      gap: '8px',
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="text"
                      className="input"
                      placeholder="Cód. (opcional)"
                      value={novoItemCodigo}
                      onChange={e => setNovoItemCodigo(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input"
                      placeholder="Nome do item comprado"
                      value={novoItemNome}
                      onChange={e => setNovoItemNome(e.target.value)}
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="Qtd"
                      value={novoItemQtd}
                      onChange={e => setNovoItemQtd(e.target.value)}
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      placeholder="R$ Unit."
                      value={novoItemValor}
                      onChange={e => setNovoItemValor(e.target.value)}
                    />
                    <select
                      className="input"
                      value={novoItemCat}
                      onChange={e => setNovoItemCat(e.target.value)}
                    >
                      {CATEGORIAS_COMPRAS.map(c => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                      onClick={() => adicionarItemEmReciboExistente(r.id)}
                    >
                      Salvar Item
                    </button>
                  </div>
                )}

                {/* Lista de Itens Comprados da Nota */}
                {expandido && (
                  <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--borda)' }}>
                    {itensDaNota.length === 0 ? (
                      <div style={{ fontSize: '0.82rem', color: 'var(--texto-secundario)' }}>
                        Nenhum item individual registrado nesta nota. Clique em <strong>"+ Item"</strong> para adicionar ou importe notas pelo leitor de IA.
                      </div>
                    ) : (
                      <div className="tabela-container">
                        <table className="tabela">
                          <thead>
                            <tr>
                              <th style={{ width: '110px' }}>Cód. Loja</th>
                              <th>Produto / Item Comprado</th>
                              <th>Categoria</th>
                              <th>Qtd</th>
                              <th>Valor Unit.</th>
                              <th>Subtotal</th>
                              <th style={{ textAlign: 'right' }}>Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itensDaNota.map(item => {
                              const estaEditando = itemEditandoId === item.id
                              const subtotal = estaEditando
                                ? (parseFloat(editItemQtd) || 1) * (parseFloat(editItemValor) || 0)
                                : Number(item.quantidade || 1) * Number(item.valor_unitario || 0)
                              return (
                                <tr key={item.id}>
                                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--texto-secundario)' }}>
                                    {estaEditando ? (
                                      <input
                                        type="text"
                                        className="input"
                                        placeholder="Código"
                                        value={editItemCodigo}
                                        onChange={e => setEditItemCodigo(e.target.value)}
                                        style={{ width: '95px', padding: '4px 6px', fontSize: '0.78rem' }}
                                      />
                                    ) : item.codigo_produto ? (
                                      <span
                                        style={{
                                          padding: '2px 6px',
                                          borderRadius: '6px',
                                          background: 'rgba(255,255,255,0.06)',
                                          border: '1px solid var(--borda)',
                                        }}
                                        title={`Chave composta: ${r.fornecedor || 'Loja'} + #${item.codigo_produto}`}
                                      >
                                        #{item.codigo_produto}
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td style={{ fontWeight: 600 }}>
                                    {estaEditando ? (
                                      <input
                                        type="text"
                                        className="input"
                                        value={editItemNome}
                                        onChange={e => setEditItemNome(e.target.value)}
                                        style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                                      />
                                    ) : (
                                      item.nome_produto
                                    )}
                                  </td>
                                  <td>
                                    {estaEditando ? (
                                      <select
                                        className="input"
                                        value={editItemCat}
                                        onChange={e => setEditItemCat(e.target.value)}
                                        style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                                      >
                                        {CATEGORIAS_COMPRAS.map(c => (
                                          <option key={c} value={c}>
                                            {c}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: '0.72rem',
                                          padding: '3px 8px',
                                          borderRadius: '999px',
                                          background: 'rgba(56, 189, 248, 0.14)',
                                          color: '#38bdf8',
                                        }}
                                      >
                                        {item.categoria_sugerida || 'Geral'}
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {estaEditando ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={editItemQtd}
                                        onChange={e => setEditItemQtd(e.target.value)}
                                        style={{ width: '72px', padding: '4px 6px', fontSize: '0.82rem' }}
                                      />
                                    ) : (
                                      Number(item.quantidade || 1)
                                    )}
                                  </td>
                                  <td>
                                    {estaEditando ? (
                                      <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={editItemValor}
                                        onChange={e => setEditItemValor(e.target.value)}
                                        style={{ width: '92px', padding: '4px 6px', fontSize: '0.82rem' }}
                                      />
                                    ) : (
                                      `R$ ${Number(item.valor_unitario || 0).toFixed(2)}`
                                    )}
                                  </td>
                                  <td style={{ fontWeight: 700, color: 'var(--cor-sucesso)' }}>
                                    R$ {subtotal.toFixed(2)}
                                  </td>
                                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                    {estaEditando ? (
                                      <>
                                        <button
                                          type="button"
                                          className="btn btn-primary"
                                          onClick={() => salvarEdicaoItem(item)}
                                          style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: '6px' }}
                                        >
                                          ✓ Salvar
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-secondary"
                                          onClick={() => setItemEditandoId(null)}
                                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                        >
                                          Cancelar
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => iniciarEdicaoItem(item)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: '#38bdf8',
                                            marginRight: '8px',
                                          }}
                                          title="Editar item"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => excluirItemRecibo(item.id)}
                                          style={{
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--cor-perigo)',
                                          }}
                                          title="Remover item"
                                        >
                                          ✕
                                        </button>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Importação de Nota Fiscal com IA */}
      {modalIaAberto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '880px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  🤖 Importar Nota da Compra com IA (OCR)
                </h2>
                <p style={{ fontSize: '0.82rem', color: 'var(--texto-secundario)', marginTop: '2px' }}>
                  Envie uma foto ou PDF do cupom fiscal (NFC-e / Nota). A IA extrairá o mercado, a data e todos os itens comprados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalIaAberto(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--texto-secundario)' }}
              >
                ✕
              </button>
            </div>

            {/* Seleção do arquivo + botão de análise */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap',
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px dashed rgba(16, 185, 129, 0.4)',
                marginBottom: '20px',
              }}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                className="input"
                style={{ flex: 1, minWidth: '240px' }}
                onChange={e => {
                  const f = e.target.files?.[0] || null
                  setArquivoIa(f)
                  if (f) {
                    handleExtrairComIA(f)
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                disabled={!arquivoIa || analisandoIa}
                onClick={() => handleExtrairComIA(arquivoIa)}
                style={{ whiteSpace: 'nowrap' }}
              >
                {analisandoIa ? '⏳ Analisando Nota com IA...' : '🔍 Extrair Todos os Itens'}
              </button>
            </div>

            {erroIa && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                ⚠️ {erroIa}
              </div>
            )}

            {analisandoIa && (
              <div style={{ textAlign: 'center', padding: '28px', color: 'var(--texto-secundario)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🤖🧾</div>
                <div>Lendo nota fiscal com Visão Computacional e extraindo todos os produtos comprados...</div>
              </div>
            )}

            {/* Dados extraídos para revisão */}
            {!analisandoIa && (iaFornecedor || iaItens.length > 0) && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                    marginBottom: '18px',
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Estabelecimento / Mercado</label>
                    <input
                      type="text"
                      className="input"
                      value={iaFornecedor}
                      onChange={e => setIaFornecedor(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Data da Compra</label>
                    <input
                      type="date"
                      className="input"
                      value={iaDataCompra}
                      onChange={e => setIaDataCompra(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Valor Total da Nota (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={iaValorTotal}
                      onChange={e => setIaValorTotal(e.target.value)}
                    />
                  </div>
                </div>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    marginBottom: '18px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={lancarEmFinancas}
                    onChange={e => setLancarEmFinancas(e.target.checked)}
                  />
                  Lançar valor total automaticamente como despesa paga no módulo de Finanças
                </label>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                    📦 Itens Extraídos da Nota ({iaItens.filter(i => i.selecionado).length} selecionados)
                  </h3>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                    onClick={() =>
                      setIaItens(prev => [
                        ...prev,
                        {
                          selecionado: true,
                          nome_produto: '',
                          quantidade: 1,
                          valor_unitario: 0,
                          categoria_sugerida: 'Alimentação',
                        },
                      ])
                    }
                  >
                    + Adicionar Item
                  </button>
                </div>

                <div className="tabela-container" style={{ maxHeight: '340px', overflowY: 'auto', marginBottom: '20px' }}>
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th style={{ width: '36px' }}>✓</th>
                        <th style={{ width: '115px' }}>Cód. Loja</th>
                        <th>Produto (Descrição Personalizável)</th>
                        <th style={{ width: '90px' }}>Qtd</th>
                        <th style={{ width: '115px' }}>Valor Unit. (R$)</th>
                        <th style={{ width: '150px' }}>Categoria</th>
                        <th style={{ width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {iaItens.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <input
                              type="checkbox"
                              checked={item.selecionado}
                              onChange={e => {
                                const copia = [...iaItens]
                                copia[idx].selecionado = e.target.checked
                                setIaItens(copia)
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="input"
                              placeholder="Código"
                              style={{ padding: '6px 8px', fontSize: '0.78rem', fontFamily: 'monospace' }}
                              value={item.codigo_produto || ''}
                              onChange={e => {
                                const copia = [...iaItens]
                                copia[idx].codigo_produto = e.target.value
                                setIaItens(copia)
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="input"
                              style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                              value={item.nome_produto}
                              onChange={e => {
                                const copia = [...iaItens]
                                copia[idx].nome_produto = e.target.value
                                setIaItens(copia)
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              className="input"
                              style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                              value={item.quantidade}
                              onChange={e => {
                                const copia = [...iaItens]
                                copia[idx].quantidade = parseFloat(e.target.value) || 1
                                setIaItens(copia)
                              }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              className="input"
                              style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                              value={item.valor_unitario}
                              onChange={e => {
                                const copia = [...iaItens]
                                copia[idx].valor_unitario = parseFloat(e.target.value) || 0
                                setIaItens(copia)
                              }}
                            />
                          </td>
                          <td>
                            <select
                              className="input"
                              style={{ padding: '6px 8px', fontSize: '0.82rem' }}
                              value={item.categoria_sugerida}
                              onChange={e => {
                                const copia = [...iaItens]
                                copia[idx].categoria_sugerida = e.target.value
                                setIaItens(copia)
                              }}
                            >
                              {CATEGORIAS_COMPRAS.map(c => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => setIaItens(prev => prev.filter((_, i) => i !== idx))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setModalIaAberto(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={salvandoIa}
                    onClick={handleConfirmarImportacaoIA}
                  >
                    {salvandoIa
                      ? 'Salvando Nota e Itens...'
                      : `✅ Registrar Nota e ${iaItens.filter(i => i.selecionado).length} Itens`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
