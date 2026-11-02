'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './layout.module.css'

interface ItemNavegacao {
  rotulo: string
  caminho: string
  icone: string
}

const ITENS_MENU: ItemNavegacao[] = [
  { rotulo: 'Painel Geral', caminho: '/', icone: '📊' },
  { rotulo: 'Finanças', caminho: '/financas', icone: '💰' },
  { rotulo: 'Rotinas & Gamificação', caminho: '/rotinas', icone: '⭐' },
  { rotulo: 'Membros da Família', caminho: '/usuarios', icone: '👥' },
  { rotulo: 'Eventos', caminho: '/eventos', icone: '🎉' },
  { rotulo: 'Contatos & Apoio', caminho: '/contatos', icone: '📞' },
  { rotulo: 'Saúde & Bem-Estar', caminho: '/saude', icone: '🩺' },
  { rotulo: 'Inventário & Casa', caminho: '/inventario', icone: '📦' },
  { rotulo: 'Cofre de Senhas', caminho: '/cofre', icone: '🔐' },
  { rotulo: 'Mural de Conquistas', caminho: '/mural', icone: '🖼️' },
  { rotulo: 'Compras & Recibos', caminho: '/compras', icone: '🛒' },
  { rotulo: 'Automação (IoT)', caminho: '/automacao', icone: '📹' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logoArea}>
        <div className={styles.logoIcon}>F</div>
        <div>
          <div className={styles.logoTitle}>Familia OS</div>
          <div className={styles.logoSubtitle}>Gestão Familiar Integrada</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {ITENS_MENU.map((item) => {
          const ativo = pathname === item.caminho
          return (
            <Link
              key={item.caminho}
              href={item.caminho}
              className={`${styles.navItem} ${ativo ? styles.navItemActive : ''}`}
            >
              <span>{item.icone}</span>
              <span>{item.rotulo}</span>
            </Link>
          )
        })}
      </nav>

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: 'var(--raio-md)',
          backgroundColor: 'var(--bg-hover)',
          border: '1px solid var(--borda)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--texto-principal)' }}>
            📱 App Android
          </span>
          <span
            className="badge badge-primary"
            style={{ fontSize: '0.65rem', padding: '2px 6px' }}
          >
            v2.0 APK
          </span>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--texto-secundario)', lineHeight: 1.35 }}>
          Instale o aplicativo nativo sincronizado com a sua família.
        </span>
        <a
          href="/api/download/apk"
          download="familia-os.apk"
          className="btn btn-primary"
          style={{
            width: '100%',
            padding: '8px 10px',
            fontSize: '0.78rem',
            textAlign: 'center',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <span>⬇️ Baixar App (.APK)</span>
        </a>
      </div>
    </aside>
  )
}
