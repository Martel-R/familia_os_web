'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Conquista {
  id: string
  titulo: string
  descricao?: string
  usuario_id?: string
  data_conquista: string
  caminho_foto?: string
  total_reacoes: number
}

interface Usuario {
  id: string
  nome: string
  avatar_url?: string
}

export default function MuralPage() {
  const [conquistas, setConquistas] = useState<Conquista[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Formulário
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [usuarioId, setUsuarioId] = useState('')
  const [dataConquista, setDataConquista] = useState('')

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const { data: usuariosData } = await supabase.from('usuarios').select('id, nome, avatar_url').order('nome')
      if (usuariosData) setUsuarios(usuariosData)

      const { data: conquistasData } = await supabase.from('mural_conquistas').select('*').order('data_conquista', { ascending: false })
      if (conquistasData) setConquistas(conquistasData)

    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !dataConquista || salvando) return

    setSalvando(true)
    try {
      const nova = {
        titulo,
        descricao: descricao || null,
        usuario_id: usuarioId || null,
        data_conquista: dataConquista,
        total_reacoes: 0
      }

      const { data, error } = await supabase.from('mural_conquistas').insert([nova]).select()

      if (error) {
        alert('Erro ao salvar conquista: ' + error.message)
      } else if (data) {
        setConquistas([data[0], ...conquistas])
        setTitulo('')
        setDescricao('')
        setDataConquista('')
      }
    } finally {
      setSalvando(false)
    }
  }

  const adicionarReacao = async (id: string, atual: number) => {
    try {
      const novoTotal = atual + 1
      setConquistas(prev => prev.map(c => c.id === id ? { ...c, total_reacoes: novoTotal } : c))
      await supabase.from('mural_conquistas').update({ total_reacoes: novoTotal }).eq('id', id)
    } catch (err) {
      console.error(err)
    }
  }

  const excluirConquista = async (id: string) => {
    if (!confirm('Deseja excluir esta conquista do mural?')) return
    try {
      await supabase.from('mural_conquistas').delete().eq('id', id)
      setConquistas(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Mural de Conquistas & Fotos
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Histórico de momentos importantes e vitórias da família.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>🌟 Registrar Nova Conquista</h2>
        <form onSubmit={handleAdicionar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Título da Conquista</label>
            <input type="text" className="input" placeholder="Ex: Medalha no Judô" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Membro (Opcional)</label>
            <select className="input" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
              <option value="">Para a família toda</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Data</label>
            <input type="date" className="input" value={dataConquista} onChange={(e) => setDataConquista(e.target.value)} required />
          </div>

          <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
            <label className="form-label">Descrição (Opcional)</label>
            <textarea className="input" rows={2} placeholder="Detalhes do momento..." value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? 'Salvando...' : '+ Adicionar ao Mural'}
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {conquistas.length === 0 && !carregando ? (
          <div className="card" style={{ textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhuma conquista registrada no mural ainda.
          </div>
        ) : (
          conquistas.map(c => {
            const u = usuarios.find(x => x.id === c.usuario_id)
            return (
              <div key={c.id} className="card" style={{ borderLeft: '4px solid var(--cor-primaria)', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{c.titulo}</h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', marginTop: '4px' }}>
                      {u ? `${u.avatar_url || '👤'} ${u.nome} • ` : '👨‍👩‍👧‍👦 Família • '}
                      📅 {new Date(c.data_conquista).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <button type="button" onClick={() => excluirConquista(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)', fontSize: '1rem' }}>🗑️</button>
                </div>

                {c.descricao && (
                  <p style={{ marginTop: '12px', fontSize: '0.95rem' }}>{c.descricao}</p>
                )}

                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button type="button" onClick={() => adicionarReacao(c.id, c.total_reacoes)} className="btn btn-secondary" style={{ padding: '6px 12px', borderRadius: 'var(--raio-full)' }}>
                    👏 Parabéns
                  </button>
                  {c.total_reacoes > 0 && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--texto-secundario)', fontWeight: 600 }}>
                      {c.total_reacoes} {c.total_reacoes === 1 ? 'palma' : 'palmas'}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
