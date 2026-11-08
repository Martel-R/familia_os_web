import { NextResponse } from 'next/server'

const VERSION_JSON_URL =
  'https://github.com/Martel-R/familia_os_android/releases/download/latest-apk/version.json'

export async function GET() {
  try {
    const res = await fetch(`${VERSION_JSON_URL}?t=${Date.now()}`, {
      redirect: 'follow',
      cache: 'no-store',
      headers: {
        'User-Agent': 'FamiliaOS-Web-VersionCheck/2.0',
        Accept: 'application/json',
      },
    })

    if (res.ok) {
      const dados = await res.json()
      return NextResponse.json(dados, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      })
    }

    return NextResponse.json(
      {
        versionCode: 1,
        versionName: '2.0',
        apkUrl: 'https://familia.martel.page/api/download/apk',
        fallbackApkUrl:
          'https://github.com/Martel-R/familia_os_android/releases/download/latest-apk/familia-os.apk',
        releaseNotes: 'Nova versão disponível',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (erro: unknown) {
    const msg = erro instanceof Error ? erro.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
