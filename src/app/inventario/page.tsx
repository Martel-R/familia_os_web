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

export default function InventarioPage() {
  const [itens, setItens] = useState<ItemInventario[]>([])
  const [contatos, setContatos] = useState<ContatoProfissional[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Formulário de novo item
  const [nomeItem, setNomeItem] = useState('')
  const [localizacao, setLocalizacao] = useState('')
  const [quantidade, setQuantidade] = useState('1')
  const [garantia, setGarantia] = useState('')

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

  const semearExemplos = async () => {
    setSalvando(true)
    try {
      const itensExemplo = [
        { nome: 'Smart TV 65" 4K', localizacao: 'Sala de Estar', quantidade: 1, data_fim_garantia: '2027-04-10' },
        { nome: 'Geladeira Inverter Side by Side', localizacao: 'Cozinha', quantidade: 1, data_fim_garantia: '2028-11-20' },
        { nome: 'Furadeira / Parafusadeira Bosch', localizacao: 'Garagem / Caixa de Ferramentas', quantidade: 1, data_fim_garantia: '2025-01-01' },
      ]
      await supabase.from('inventario_itens').insert(itensExemplo)

      const contatosExemplo = [
        { nome: 'Seu Raimundo (Encanador)', especialidade: 'Encanamento & Vazamentos', telefone: '(91) 98765-4321', eh_emergencia: true },
        { nome: 'Marcos Eletricista', especialidade: 'Instalações & Quadro Elétrico', telefone: '(91) 98123-4567', eh_emergencia: true },
      ]
      await supabase.from('agenda_contatos').insert(contatosExemplo)

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
            Itens físicos e prestadores de serviços sincronizados com o Supabase.
          </p>
        </div>

        {itens.length === 0 && !carregando && (
          <button onClick={semearExemplos} className="btn btn-secondary" disabled={salvando}>
            🌱 Inicializar Itens de Exemplo
          </button>
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
              placeholder="Ex: Cozinha, Quarto 1"
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
            <label className="form-label">Fim da Garantia (Opcional)</label>
            <input
              type="date"
              className="input"
              value={garantia}
              onChange={(e) => setGarantia(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvando}>
            {salvando ? 'Salvando...' : '+ Adicionar ao Inventário'}
          </button>
        </form>
      </div>

      {/* Tabela de Itens de Inventário */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Bens & Equipamentos Mapeados</h2>
          {carregando && <span style={{ fontSize: '0.875rem', color: 'var(--texto-secundario)' }}>Carregando...</span>}
        </div>

        {itens.length === 0 && !carregando ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhum item cadastrado no inventário ainda.
          </div>
        ) : (
          <div className="tabela-container">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Localização</th>
                  <th>Qtd.</th>
                  <th>Término da Garantia</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.nome}</td>
                    <td>{item.localizacao}</td>
                    <td>{item.quantidade}</td>
                    <td>
                      {item.data_fim_garantia ? (
                        <span className="badge badge-success">
                          Até {item.data_fim_garantia}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--texto-secundario)', fontSize: '0.8rem' }}>Sem registro</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contatos de Prestadores & Emergência */}
      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Agenda de Prestadores de Serviço</h2>
        {contatos.length === 0 && !carregando ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhum contato profissional cadastrado.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {contatos.map((contato) => (
              <div
                key={contato.id}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--raio-md)',
                  border: '1px solid var(--borda)',
                  backgroundColor: 'var(--bg-hover)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{contato.nome}</span>
                  {contato.eh_emergencia && <span className="badge badge-danger">SOS</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>
                  {contato.especialidade}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '12px', color: 'var(--cor-primaria)' }}>
                  📞 {contato.telefone}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
