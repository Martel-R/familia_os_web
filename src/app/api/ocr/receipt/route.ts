import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const incomingForm = await req.formData()
    const file = incomingForm.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo de cupom ou nota fiscal enviado.' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const contentType = file.type || 'image/jpeg'
    const fileName = file.name || 'cupom.jpg'

    const aiUrl =
      process.env.AI_API_URL ||
      process.env.NEXT_PUBLIC_AI_API_URL ||
      'http://familia-os-ai:8000'

    const candidateUrls = [
      `${aiUrl}/api/ocr/receipt`,
      'https://ai-familia.martel.page/api/ocr/receipt',
      'http://127.0.0.1:8001/api/ocr/receipt',
    ]

    let lastError = 'Falha ao conectar ao serviço de IA'

    for (const url of candidateUrls) {
      try {
        const fd = new FormData()
        const blob = new Blob([arrayBuffer], { type: contentType })
        fd.append('file', blob, fileName)

        const res = await fetch(url, {
          method: 'POST',
          body: fd,
        })

        if (res.ok) {
          const data = await res.json()
          return NextResponse.json(data)
        } else {
          lastError = await res.text()
        }
      } catch (e: any) {
        lastError = e?.message || String(e)
      }
    }

    return NextResponse.json(
      { error: `Erro ao processar nota fiscal na IA: ${lastError}` },
      { status: 502 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: `Erro ao encaminhar nota fiscal para IA: ${error.message}` },
      { status: 500 }
    )
  }
}
