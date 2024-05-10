'use client'

import DataProvider from '@/hooks/useData'
import { SWRConfig } from 'swr'

export default function Wrapper({ children }: { children: React.ReactNode }) {
  return <SWRConfig>
    <DataProvider>
      {children}
    </DataProvider>
  </SWRConfig>
}
