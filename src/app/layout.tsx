import type { Metadata } from 'next'
import './globals.css'
import styles from '@/components/layout/layout.module.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export const metadata: Metadata = {
  title: 'Familia OS - Gestão Familiar Inteligente',
  description: 'Plataforma integrada para rotinas, finanças, saúde e patrimônio da família.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className={styles.container}>
          <Sidebar />
          <div className={styles.mainArea}>
            <Header />
            <main className={styles.conteudo}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
