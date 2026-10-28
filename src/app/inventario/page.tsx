'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface ItemInventario {
  id: string
  nome: string
  localizacao: string
  quantidade: number
  data_fim_garantia?: string
}

interface ContatoProfissional {
  id: string
  nome: string
  especialidade: string
  telefone: string
  eh_emergencia: boolean
}

interface Manutencao {
  id: string
  item_id?: string
  prestador_id?: string
  descricao: string
  data_servico: string
  custo?: number
  data_proxima_manutencao?: string
}

export default function InventarioPage() {
  const [itens, setItens] = useState<ItemInventario[]>([])
  const [contatos, setContatos] = useState<ContatoProfissional[]>([])
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Formulário de novo item
  const [nomeItem, setNomeItem] = useState('')
  const [localizacao, setLocalizacao] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [garantia, setGarantia] = useState('')

  // Formulário de Manutenção
  const [manItemId, setManItemId] = useState('')
  const [manPrestadorId, setManPrestadorId] = useState('')
  const [manDescricao, setManDescricao] = useState('')
  const [manDataServico, setManDataServico] = useState('')
  const [manCusto, setManCusto] = useState('')
  const [manDataProxima, setManDataProxima] = useState('')
  const [salvandoMan, setSalvandoMan] = useState(false)

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const { data: itensData } = await supabase
        .from('inventario_itens')
        .select('*')
        .order('nome', { ascending: true })

      if (itensData) setItens(itensData)

      const { data: contatosData } = await supabase
        .from('agenda_contatos')
        .select('*')
        .order('nome', { ascending: true })

      if (contatosData) setContatos(contatosData)

      const { data: manData } = await supabase
        .from('historico_manutencoes')
        .select('*')
        .order('data_servico', { ascending: false })

      if (manData) setManutencoes(manData)

    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleAdicionarItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nomeItem.trim() || !localizacao.trim() || salvando) return

    setSalvando(true)
    try {
      const novo = {
        nome: nomeItem,
        localizacao,
        quantidade: parseInt(quantidade) || 1,
        data_fim_garantia: garantia || null,
      }

      const { data, error } = await supabase
        .from('inventario_itens')
        .insert([novo])
        .select()

      if (error) {
        alert('Erro ao salvar item no banco: ' + error.message)
      } else if (data) {
        setItens([...itens, data[0]])
        setNomeItem('')
        setLocalizacao('')
        setGarantia('')
      }
    } finally {
      setSalvando(false)
    }
  }

  const handleSalvarManutencao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manDescricao.trim() || !manDataServico || salvandoMan) return

    setSalvandoMan(true)
    try {
      const nova = {
        item_id: manItemId || null,
        prestador_id: manPrestadorId || null,
        descricao: manDescricao,
        data_servico: manDataServico,
        custo: parseFloat(manCusto) || null,
        data_proxima_manutencao: manDataProxima || null,
      }

      const { error } = await supabase.from('historico_manutencoes').insert([nova])
      if (error) throw error

      await carregarDados()
      setManDescricao('')
      setManCusto('')
      setManDataProxima('')
    } catch (err: any) {
      alert('Erro ao salvar manutenção: ' + err.message)
    } finally {
      setSalvandoMan(false)
    }
  }

  const excluirManutencao = async (id: string) => {
    if (!confirm('Deseja excluir este registro de manutenção?')) return
    try {
      await supabase.from('historico_manutencoes').delete().eq('id', id)
      setManutencoes((prev) => prev.filter(m => m.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  const semearExemplos = async () => {
    setSalvando(true)
    try {
      const itensExemplo = [
        { nome: 'Smart TV 65" 4K', localizacao: 'Sala de Estar', quantidade: 1, data_fim_garantia: '2027-04-10' },
        { nome: 'Geladeira Inverter Side by Side', localizacao: 'Cozinha', quantidade: 1, data_fim_garantia: '2028-11-20' },
        { nome: 'Ar Condicionado Inverter', localizacao: 'Quarto Casal', quantidade: 1, data_fim_garantia: '2025-01-01' },
      ]
      await supabase.from('inventario_itens').insert(itensExemplo)

      await carregarDados()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Inventário & Manutenção da Casa
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Itens físicos, equipamentos e histórico de serviços.
          </p>
        </div>

        {itens.length === 0 && !carregando && (
          <button onClick={semearExemplos} className="btn btn-secondary" disabled={salvando}>
            🌱 Inicializar Itens de Exemplo
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', marginBottom: '32px' }}>
        {/* Formulário de Nova Manutenção */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>🔧 Registrar Manutenção / Serviço</h2>
          <form onSubmit={handleSalvarManutencao} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
              <label className="form-label">Equipamento (Opcional)</label>
              <select className="input" value={manItemId} onChange={e => setManItemId(e.target.value)}>
                <option value="">Nenhum específico</option>
                {itens.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '150px' }}>
              <label className="form-label">Prestador de Serviço</label>
              <select className="input" value={manPrestadorId} onChange={e => setManPrestadorId(e.target.value)}>
                <option value="">Nenhum específico</option>
                {contatos.map(c => <option key={c.id} value={c.id}>{c.nome} ({c.especialidade || 'Contato'})</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 2, minWidth: '200px' }}>
              <label className="form-label">Serviço Realizado</label>
              <input type="text" className="input" placeholder="Ex: Limpeza e carga de gás" value={manDescricao} onChange={e => setManDescricao(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '130px' }}>
              <label className="form-label">Data</label>
              <input type="date" className="input" value={manDataServico} onChange={e => setManDataServico(e.target.value)} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '100px' }}>
              <label className="form-label">Custo (R$)</label>
              <input type="number" step="0.01" className="input" value={manCusto} onChange={e => setManCusto(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '130px' }}>
              <label className="form-label">Próxima Manutenção</label>
              <input type="date" className="input" value={manDataProxima} onChange={e => setManDataProxima(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvandoMan}>
              {salvandoMan ? 'Salvando...' : '+ Registrar Serviço'}
            </button>
          </form>
        </div>

        {/* Histórico de Manutenções Cadastrados */}
        {manutencoes.length > 0 && (
          <div className="card">
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Histórico de Serviços Realizados</h2>
            <div className="tabela-container">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Serviço / Manutenção</th>
                    <th>Equipamento</th>
                    <th>Prestador</th>
                    <th>Custo</th>
                    <th>Próxima Manutenção</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {manutencoes.map(m => {
                    const equip = itens.find(i => i.id === m.item_id)
                    const prest = contatos.find(c => c.id === m.prestador_id)
                    return (
                      <tr key={m.id}>
                        <td>{new Date(m.data_servico).toLocaleDateString('pt-BR')}</td>
                        <td style={{ fontWeight: 600 }}>{m.descricao}</td>
                        <td>{equip?.nome || '-'}</td>
                        <td>{prest?.nome || '-'}</td>
                        <td>{m.custo ? `R$ ${m.custo.toFixed(2)}` : '-'}</td>
                        <td style={{ color: 'var(--cor-alerta)', fontWeight: 600 }}>
                          {m.data_proxima_manutencao ? new Date(m.data_proxima_manutencao).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button type="button" onClick={() => excluirManutencao(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Formulário de Novo Item */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Cadastrar Novo Item no Inventário</h2>
        <form onSubmit={handleAdicionarItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nome do Item / Equipamento</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Micro-ondas Brastemp"
              value={nomeItem}
              onChange={(e) => setNomeItem(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Cômodo / Localização</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Cozinha, Quarto Casal"
              value={localizacao}
              onChange={(e) => setLocalizacao(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Quantidade</label>
            <input
              type="number"
              min="1"
              className="input"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Garantia Válida Até</label>
            <input
              type="date"
              className="input"
              value={garantia}
              onChange={(e) => setGarantia(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvando}>
            {salvando ? 'Salvando...' : '+ Salvar Item'}
          </button>
        </form>
      </div>

      {/* Itens do Inventário */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Lista de Equipamentos e Bens</h2>
        {itens.length === 0 && !carregando ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhum item cadastrado no inventário.
          </div>
        ) : (
          <div className="tabela-container">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome do Equipamento</th>
                  <th>Localização</th>
                  <th>Qtd</th>
                  <th>Término da Garantia</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.nome}</td>
                    <td>{item.localizacao}</td>
                    <td>{item.quantidade}</td>
                    <td>
                      {item.data_fim_garantia ? (
                        <span style={{ color: 'var(--texto-secundario)' }}>
                          {new Date(item.data_fim_garantia).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--borda)', fontSize: '0.8rem' }}>Sem registro</span>
                      )}
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