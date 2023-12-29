'use client'

import DataProvider from '@/hooks/useData'
import { Cache, SWRConfig } from 'swr'

function localStorageProvider() {
  const hasWindow = typeof window !== 'undefined'
  if(!hasWindow) return new Map() as Cache<any>
  const map = new Map(JSON.parse(localStorage.getItem('swr-cache') || '[]'))
  window.addEventListener('beforeunload', () => {
    const cache = JSON.stringify(Array.from(map.entries()))
    localStorage.setItem('swr-cache', cache)
  })
  return map as Cache<any>
}

export default function Wrapper({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ provider: localStorageProvider }}>
    <DataProvider>
      {children}
    </DataProvider>
  </SWRConfig>
}
