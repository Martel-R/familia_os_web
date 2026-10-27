import type { Metadata } from 'next'
import './globals.css'
import { LayoutShell } from '@/components/layout/LayoutShell'

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
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  )
}
