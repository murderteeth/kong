import './globals.css'
import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import Wrapper from '@/components/Wrapper'

const font = JetBrains_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Kong',
  description: 'Real-time and historical ZooTroop GraphQL API',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={font.className}>
        <Wrapper>
          {children}
        </Wrapper>
      </body>
    </html>
  )
}
