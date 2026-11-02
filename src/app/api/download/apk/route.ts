import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const GITHUB_RELEASE_APK_URL =
  'https://github.com/Martel-R/familia_os_android/releases/download/latest-apk/familia-os.apk'
const GITHUB_RELEASE_API_URL =
  'https://api.github.com/repos/Martel-R/familia_os_android/releases/tags/latest-apk'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const infoOnly = searchParams.get('info') === '1'
  const localApkPath = path.join(process.cwd(), 'public', 'downloads', 'familia-os.apk')
  const hasLocalApk = fs.existsSync(localApkPath) && fs.statSync(localApkPath).size > 100_000

  if (infoOnly) {
    let localStat = null
    if (hasLocalApk) {
      const st = fs.statSync(localApkPath)
      localStat = {
        sizeBytes: st.size,
        sizeMb: (st.size / (1024 * 1024)).toFixed(1),
        updatedAt: st.mtime.toISOString(),
      }
    }

    try {
      const res = await fetch(GITHUB_RELEASE_API_URL, {
        headers: { Accept: 'application/vnd.github+json' },
        signal: AbortSignal.timeout(3000),
      })
      if (res.ok) {
        const release = await res.json()
        const asset = (release.assets || []).find(
          (a: { name?: string }) => a.name === 'familia-os.apk'
        )
        if (asset) {
          return NextResponse.json({
            available: true,
            version: release.name || '2.0-multitenant',
            notes: release.body || '',
            sizeMb: (Number(asset.size || 0) / (1024 * 1024)).toFixed(1),
            updatedAt: asset.updated_at || release.published_at,
            downloadUrl: '/api/download/apk',
          })
        }
      }
    } catch {
      // Fallback para arquivo local
    }

    return NextResponse.json({
      available: hasLocalApk,
      version: '2.0-multitenant',
      sizeMb: localStat?.sizeMb || null,
      updatedAt: localStat?.updatedAt || null,
      downloadUrl: '/api/download/apk',
    })
  }

  // 1. Se existir arquivo local atualizado em public/downloads/familia-os.apk, verifica se há release mais recente no GitHub
  try {
    const releaseRes = await fetch(GITHUB_RELEASE_API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(2500),
    })
    if (releaseRes.ok) {
      const release = await releaseRes.json()
      const asset = (release.assets || []).find(
        (a: { name?: string; updated_at?: string }) => a.name === 'familia-os.apk'
      )
      if (asset) {
        const remoteTime = new Date(asset.updated_at || release.published_at || 0).getTime()
        const localTime = hasLocalApk ? fs.statSync(localApkPath).mtime.getTime() : 0
        if (!hasLocalApk || remoteTime > localTime + 60_000) {
          return NextResponse.redirect(GITHUB_RELEASE_APK_URL, 302)
        }
      }
    }
  } catch {
    // Continua para servir o APK local
  }

  // 2. Serve o arquivo APK local empacotado em public/downloads/familia-os.apk
  if (hasLocalApk) {
    const fileBuffer = fs.readFileSync(localApkPath)
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="familia-os.apk"',
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  }

  // 3. Fallback direto para URL de release do GitHub
  return NextResponse.redirect(GITHUB_RELEASE_APK_URL, 302)
}
