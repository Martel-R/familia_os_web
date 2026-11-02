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

  // Redireciona diretamente para o CDN da Release do GitHub (suporta HTTP Range/Resume no Android sem timeout no túnel)
  return NextResponse.redirect(GITHUB_RELEASE_APK_URL, 302)
}
