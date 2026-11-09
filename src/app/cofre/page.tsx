'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useFamilia, DEFAULT_FAMILIA_ID } from '@/lib/tenant/FamiliaContext'

interface Credencial {
  id: string
  titulo: string
  login_usuario: string
  nivel: 'compartilhado' | 'master'
  senha_criptografada: string
  url_acesso?: string
}

interface WifiFamiliar {
  id?: string
  apelido?: string
  nomeRedeSsid: string
  senhaRede: string
  tipoSeguranca: string
  ehRedeVisitantes: boolean
}

export default function CofrePage() {
  const { familiaId } = useFamilia()
  const wifiConfigKey =
    !familiaId || familiaId === DEFAULT_FAMILIA_ID
      ? 'WIFI_PRINCIPAL'
      : `WIFI_PRINCIPAL:${familiaId}`
  const [credenciais, setCredenciais] = useState<Credencial[]>([])
  const [redesWifi, setRedesWifi] = useState<WifiFamiliar[]>([])
  const [visibilidade, setVisibilidade] = useState<{ [id: string]: boolean }>({})
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Formulário de Credencial
  const [titulo, setTitulo] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [nivel, setNivel] = useState<'compartilhado' | 'master'>('compartilhado')

  // Formulário de WiFi
  const [wifiEditId, setWifiEditId] = useState<string | null>(null)
  const [wifiApelido, setWifiApelido] = useState('')
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiSenha, setWifiSenha] = useState('')
  const [wifiSeguranca, setWifiSeguranca] = useState('WPA2/WPA3')
  const [wifiVisitante, setWifiVisitante] = useState(false)
  const [editandoWifi, setEditandoWifi] = useState(false)
  const [salvandoWifi, setSalvandoWifi] = useState(false)
  const [verWifiMap, setVerWifiMap] = useState<{ [k: string]: boolean }>({})

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const { data: credsData } = await supabase
        .from('cofre_credenciais')
        .select('*')
        .order('titulo', { ascending: true })

      if (credsData) setCredenciais(credsData)

      const { data: configData } = await supabase
        .from('configuracoes_casa')
        .select('valor')
        .eq('id', wifiConfigKey)
        .maybeSingle()

      if (configData && configData.valor) {
        const wifiVal = configData.valor as any
        if (Array.isArray(wifiVal.redes) && wifiVal.redes.length > 0) {
          setRedesWifi(wifiVal.redes)
        } else if (wifiVal.nomeRedeSsid) {
          setRedesWifi([
            {
              id: 'principal',
              apelido: 'Wi-Fi Principal da Casa',
              nomeRedeSsid: wifiVal.nomeRedeSsid,
              senhaRede: wifiVal.senhaRede || '',
              tipoSeguranca: wifiVal.tipoSeguranca || 'WPA2/WPA3',
              ehRedeVisitantes: Boolean(wifiVal.ehRedeVisitantes),
            },
          ])
        } else {
          setRedesWifi([])
        }
      }
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [wifiConfigKey])

  const toggleVisibilidade = (id: string) => {
    setVisibilidade((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleAdicionar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim() || !senha.trim() || salvando) return

    setSalvando(true)
    try {
      const nova = {
        titulo,
        login_usuario: login,
        senha_criptografada: senha,
        nivel,
      }

      const { data, error } = await supabase
        .from('cofre_credenciais')
        .insert([nova])
        .select()

      if (error) {
        alert('Erro ao salvar no cofre: ' + error.message)
      } else if (data) {
        setCredenciais([...credenciais, data[0]])
        setTitulo('')
        setLogin('')
        setSenha('')
      }
    } finally {
      setSalvando(false)
    }
  }

  const persistirListaWifi = async (novaLista: WifiFamiliar[]) => {
    const principal = novaLista[0] || {
      nomeRedeSsid: '',
      senhaRede: '',
      tipoSeguranca: 'WPA2/WPA3',
      ehRedeVisitantes: false,
    }
    const valor = {
      nomeRedeSsid: principal.nomeRedeSsid,
      senhaRede: principal.senhaRede,
      tipoSeguranca: principal.tipoSeguranca,
      ehRedeVisitantes: principal.ehRedeVisitantes,
      redes: novaLista,
    }
    const { error } = await supabase
      .from('configuracoes_casa')
      .upsert({ id: wifiConfigKey, valor })
    if (error) throw error
    setRedesWifi(novaLista)
  }

  const handleSalvarWifi = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvandoWifi(true)
    try {
      const novaRede: WifiFamiliar = {
        id: wifiEditId || `wifi-${Date.now()}`,
        apelido: wifiApelido.trim() || wifiSsid.trim(),
        nomeRedeSsid: wifiSsid.trim(),
        senhaRede: wifiSenha.trim(),
        tipoSeguranca: wifiSeguranca || 'WPA2/WPA3',
        ehRedeVisitantes: wifiVisitante,
      }
      const lista = [...redesWifi]
      const idx = lista.findIndex(
        (r) =>
          (wifiEditId && r.id === wifiEditId) ||
          r.nomeRedeSsid.toLowerCase() === novaRede.nomeRedeSsid.toLowerCase()
      )
      if (idx >= 0) {
        lista[idx] = novaRede
      } else {
        lista.push(novaRede)
      }
      await persistirListaWifi(lista)
      setEditandoWifi(false)
      setWifiEditId(null)
    } catch (err: any) {
      alert('Erro ao salvar Wi-Fi: ' + err.message)
    } finally {
      setSalvandoWifi(false)
    }
  }

  const handleExcluirWifi = async (idOuSsid: string) => {
    if (!confirm('Deseja remover esta rede Wi-Fi da lista compartilhada?')) return
    try {
      const novaLista = redesWifi.filter((r) => (r.id || r.nomeRedeSsid) !== idOuSsid)
      await persistirListaWifi(novaLista)
    } catch (err: any) {
      alert('Erro ao excluir Wi-Fi: ' + err.message)
    }
  }

  const excluirCredencial = async (id: string) => {
    if (!confirm('Deseja excluir esta senha do cofre?')) return
    try {
      await supabase.from('cofre_credenciais').delete().eq('id', id)
      setCredenciais(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            Cofre de Identidade & Senhas
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '0.875rem', marginTop: '4px' }}>
            Credenciais seguras e informações da rede Wi-Fi familiar.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', marginBottom: '32px' }}>
        {/* Painel Wi-Fi Compartilhado */}
        <div className="card" style={{ borderLeft: '4px solid var(--cor-sucesso)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '8px' }}>
                📶 Redes Wi-Fi Compartilhadas da Família ({redesWifi.length})
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--texto-secundario)', marginBottom: '16px' }}>
                Todas as redes Wi-Fi salvas aqui ficam disponíveis no App Android de todos os membros da família para conexão com 1 toque.
              </p>
            </div>
            {!editandoWifi && (
              <button
                type="button"
                onClick={() => {
                  setWifiEditId(null)
                  setWifiApelido('')
                  setWifiSsid('')
                  setWifiSenha('')
                  setWifiSeguranca('WPA2/WPA3')
                  setWifiVisitante(false)
                  setEditandoWifi(true)
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                + Nova Rede Wi-Fi
              </button>
            )}
          </div>

          {editandoWifi && (
            <form onSubmit={handleSalvarWifi} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', alignItems: 'flex-end', backgroundColor: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--raio-md)', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Local / Apelido</label>
                <input type="text" className="input" placeholder="Ex: Casa 5G, Casa da Vó" value={wifiApelido} onChange={e => setWifiApelido(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome da Rede (SSID)</label>
                <input type="text" className="input" value={wifiSsid} onChange={e => setWifiSsid(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Senha do Wi-Fi</label>
                <input type="text" className="input" value={wifiSenha} onChange={e => setWifiSenha(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Segurança</label>
                <input type="text" className="input" value={wifiSeguranca} onChange={e => setWifiSeguranca(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input type="checkbox" checked={wifiVisitante} onChange={e => setWifiVisitante(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label style={{ fontSize: '0.85rem' }}>Rede de Visitantes</label>
              </div>
              <div style={{ display: 'flex', gap: '12px', gridColumn: '1 / -1' }}>
                <button type="submit" className="btn btn-primary" disabled={salvandoWifi}>{salvandoWifi ? 'Salvando...' : 'Salvar Rede Wi-Fi'}</button>
                <button type="button" className="btn btn-secondary" onClick={() => setEditandoWifi(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {redesWifi.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {redesWifi.map((r, idx) => {
                const chave = r.id || r.nomeRedeSsid
                const verSenha = Boolean(verWifiMap[chave])
                return (
                  <div
                    key={chave}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      backgroundColor: 'var(--cor-sucesso-suave)',
                      padding: '16px',
                      borderRadius: 'var(--raio-md)',
                      border: '1px solid var(--cor-sucesso)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--texto-secundario)' }}>
                          {r.apelido || r.nomeRedeSsid} {idx === 0 ? '⭐ Principal' : ''}
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--cor-sucesso)' }}>
                          SSID: {r.nomeRedeSsid}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setWifiEditId(r.id || r.nomeRedeSsid)
                            setWifiApelido(r.apelido || r.nomeRedeSsid)
                            setWifiSsid(r.nomeRedeSsid)
                            setWifiSenha(r.senhaRede)
                            setWifiSeguranca(r.tipoSeguranca || 'WPA2/WPA3')
                            setWifiVisitante(Boolean(r.ehRedeVisitantes))
                            setEditandoWifi(true)
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExcluirWifi(chave)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cor-sucesso)', fontFamily: 'monospace' }}>
                        {verSenha ? r.senhaRede : '••••••••'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setVerWifiMap((prev) => ({ ...prev, [chave]: !prev[chave] }))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.15rem' }}
                        >
                          {verSenha ? '🙈' : '👁️'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(r.senhaRede)
                            alert('Senha copiada!')
                          }}
                          className="btn btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                        >
                          📋 Copiar
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '16px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--raio-md)', textAlign: 'center', color: 'var(--texto-secundario)' }}>
              Nenhuma rede Wi-Fi cadastrada. Clique em &quot;+ Nova Rede Wi-Fi&quot; para adicionar.
            </div>
          )}
        </div>

        {/* Formulário de Nova Credencial */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Adicionar Nova Senha ao Cofre</h2>
          <form onSubmit={handleAdicionar} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Serviço / Título</label>
              <input type="text" className="input" placeholder="Ex: Wi-Fi Principal, Netflix" value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Usuário / Login</label>
              <input type="text" className="input" placeholder="Ex: conta@email.com" value={login} onChange={(e) => setLogin(e.target.value)} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Senha</label>
              <input type="password" className="input" placeholder="Senha de acesso" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nível de Proteção</label>
              <select className="input" value={nivel} onChange={(e) => setNivel(e.target.value as any)}>
                <option value="compartilhado">Compartilhado (Família)</option>
                <option value="master">Master (Apenas Pais)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ height: '42px' }} disabled={salvando}>
              {salvando ? 'Salvando...' : '+ Guardar no Cofre'}
            </button>
          </form>
        </div>
      </div>

      {/* Credenciais Salvas */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Senhas Compartilhadas & Mestre</h2>
        {credenciais.length === 0 && !carregando ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--texto-secundario)' }}>
            Nenhuma senha guardada no cofre ainda.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {credenciais.map((c) => {
              const estaVisivel = visibilidade[c.id] || false
              const isMaster = c.nivel === 'master'

              return (
                <div key={c.id} className="card" style={{ borderLeft: isMaster ? '4px solid var(--cor-perigo)' : '4px solid var(--cor-primaria)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{c.titulo}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span className={`badge ${isMaster ? 'badge-danger' : 'badge-primary'}`}>
                        {isMaster ? 'Master' : 'Família'}
                      </span>
                      <button type="button" onClick={() => excluirCredencial(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cor-perigo)' }}>🗑️</button>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.875rem', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--texto-secundario)' }}>Login:</span>
                    <strong style={{ userSelect: 'all' }}>{c.login_usuario || '-'}</strong>
                  </div>

                  <div style={{ fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: 'var(--bg-hover)', borderRadius: 'var(--raio-md)' }}>
                    <div style={{ flex: 1, fontFamily: 'monospace', letterSpacing: estaVisivel ? 'normal' : '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', userSelect: estaVisivel ? 'all' : 'none' }}>
                      {estaVisivel ? c.senha_criptografada : '••••••••••••'}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                      <button type="button" onClick={() => toggleVisibilidade(c.id)} className="btn btn-secondary" style={{ padding: '6px' }} title={estaVisivel ? 'Ocultar' : 'Revelar'}>
                        {estaVisivel ? '🙈' : '👁️'}
                      </button>

                      {estaVisivel && (
                        <button type="button" onClick={() => { navigator.clipboard.writeText(c.senha_criptografada); alert('Copiada!') }} className="btn btn-secondary" style={{ padding: '6px' }} title="Copiar">
                          📋
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
