'use client'

import { usePathname } from 'next/navigation'
import styles from './layout.module.css'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { ChatFlutuante } from '@/components/chat/ChatFlutuante'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-app)',
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.mainArea}>
        <Header />
        <main className={styles.conteudo}>{children}</main>
      </div>
      <ChatFlutuante />
    </div>
  )
}
