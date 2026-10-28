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
  { rotulo: 'Saúde & Bem-Estar', caminho: '/saude', icone: '🩺' },
  { rotulo: 'Inventário & Casa', caminho: '/inventario', icone: '📦' },
  { rotulo: 'Cofre de Senhas', caminho: '/cofre', icone: '🔐' },
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
    </aside>
  )
}
