'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './chat.module.css'

interface Mensagem {
  id: string
  remetente: 'usuario' | 'bot'
  texto: string
}

const SUGESTOES = [
  'O que temos no inventário?',
  'Quais contas temos pendentes?',
  'Quais são as tarefas de hoje?',
]

export function ChatFlutuante() {
  const [aberto, setAberto] = useState(false)
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: '1',
      remetente: 'bot',
      texto: 'Olá! Sou o assistente inteligente do Familia OS. Posso consultar onde estão os itens do inventário, status de contas, contatos de prestadores e rotinas em tempo real. O que gostaria de saber?',
    },
  ])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const finalMensagensRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aberto) {
      finalMensagensRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensagens, aberto])

  const enviarPergunta = async (perguntaTexto: string) => {
    if (!perguntaTexto.trim() || carregando) return

    const novaMensagemUsuario: Mensagem = {
      id: Math.random().toString(),
      remetente: 'usuario',
      texto: perguntaTexto,
    }

    setMensagens((prev) => [...prev, novaMensagemUsuario])
    setInput('')
    setCarregando(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: perguntaTexto }),
      })

      if (!response.ok) {
        throw new Error(`Serviço de IA indisponível (${response.status})`)
      }

      const data = await response.json()
      const novaMensagemBot: Mensagem = {
        id: Math.random().toString(),
        remetente: 'bot',
        texto: data.resposta || 'Não foi possível obter uma resposta precisa.',
      }
      setMensagens((prev) => [...prev, novaMensagemBot])
    } catch {
      setMensagens((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          remetente: 'bot',
          texto:
            '⚠️ Não consegui me comunicar com o servidor do Agente IA (FastAPI na porta 8000). Verifique se o serviço `familia_os_ai` está em execução com `uvicorn app.main:app`.',
        },
      ])
    } finally {
      setCarregando(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    enviarPergunta(input)
  }

  return (
    <>
      <button
        type="button"
        className={styles.botaoFlutuante}
        onClick={() => setAberto(!aberto)}
        aria-label="Abrir assistente inteligente"
      >
        {aberto ? '✕' : '💬'}
      </button>

      {aberto && (
        <div className={styles.janelaChat}>
          <div className={styles.cabecalho}>
            <div className={styles.tituloArea}>
              <div className={styles.avatarBot}>🤖</div>
              <div>
                <div className={styles.titulo}>Assistente Familia OS</div>
                <div className={styles.subtitulo}>Gemini 2.5 Flash • Text-to-SQL</div>
              </div>
            </div>
            <button
              type="button"
              className={styles.btnFechar}
              onClick={() => setAberto(false)}
            >
              ✕
            </button>
          </div>

          <div className={styles.mensagensArea}>
            {mensagens.map((m) => (
              <div
                key={m.id}
                className={`${styles.mensagem} ${
                  m.remetente === 'usuario'
                    ? styles.mensagemUsuario
                    : styles.mensagemBot
                }`}
              >
                {m.texto}
              </div>
            ))}

            {carregando && (
              <div className={`${styles.mensagem} ${styles.mensagemBot}`}>
                <em>Consultando o banco de dados da família... 🧠</em>
              </div>
            )}

            {mensagens.length === 1 && !carregando && (
              <div className={styles.sugestoesArea}>
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={styles.chipSugestao}
                    onClick={() => enviarPergunta(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={finalMensagensRef} />
          </div>

          <form onSubmit={handleSubmit} className={styles.formulario}>
            <input
              type="text"
              className={styles.inputChat}
              placeholder="Pergunte sobre inventário, tarefas..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={carregando}
            />
            <button
              type="submit"
              className={styles.btnEnviar}
              disabled={carregando || !input.trim()}
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  )
}
