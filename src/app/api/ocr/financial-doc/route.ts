import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const aiUrl =
      process.env.AI_API_URL ||
      process.env.NEXT_PUBLIC_AI_API_URL ||
      'http://familia-os-ai:8000'

    let res: Response
    try {
      res = await fetch(`${aiUrl}/api/ocr/financial-doc`, {
        method: 'POST',
        body: formData,
      })
    } catch {
      res = await fetch(`http://127.0.0.1:8001/api/ocr/financial-doc`, {
        method: 'POST',
        body: formData,
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
      { error: `Erro ao encaminhar documento financeiro para IA: ${error.message}` },
      { status: 500 }
    )
  }
}
