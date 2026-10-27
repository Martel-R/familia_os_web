import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // O Next.js (servidor) pode chamar o container do AI via rede interna ou porta mapeada
    const aiUrl =
      process.env.AI_API_URL ||
      process.env.NEXT_PUBLIC_AI_API_URL ||
      'http://familia-os-ai:8000'

    let res: Response
    try {
      res = await fetch(`${aiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      // Fallback para localhost caso esteja fora da rede docker
      res = await fetch(`http://127.0.0.1:8001/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json({ error: errorText }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { resposta: `Erro de comunicação com o Agente IA: ${error.message}` },
      { status: 500 }
    )
  }
}
