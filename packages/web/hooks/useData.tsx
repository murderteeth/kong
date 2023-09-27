'use client'

import { ReactNode, createContext, useContext, useEffect, useState } from 'react'

interface LatestBlock {
  chainId: number
  blockNumber: number
}

interface Vault {
  chainId: number
  address: string
  apiVersion: string
  apetaxType: string
  apetaxStatus: string
  registryStatus: string
}

interface MonitorResults {
  queues: {
    name: string
    waiting: number
    active: number
    failed: number
  }[]
  db: {
    databaseSize: number
    indexHitRate: number
    cacheHitRate: number
    clients: number
  }
  redis: {
    uptime: number
    clients: number
    memory: {
      total: number
      used: number
      peak: number
    }
  }
}

export interface DataContext {
  latestBlocks: LatestBlock[]
  vaults: Vault[]
  monitor: MonitorResults
}

const GRAPHQL_QUERY = `query Data {
  latestBlocks {
    chainId
    blockNumber
  }

  vaults {
    chainId
    address
    apetaxStatus
    apetaxType
    apiVersion
    registryStatus
  }

  monitor {
    queues {
      name
      waiting
      active
      failed
    }
    db {
      databaseSize
      indexHitRate
      cacheHitRate
      clients
    }
    redis {
      uptime
      clients
      memory {
        total
        used
        peak
      }
    }
  }
}`

async function fetchData() {
  const response = await fetch(process.env.NEXT_PUBLIC_GQL || 'http://localhost:3001/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GRAPHQL_QUERY })
  })

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  return (await response.json()).data as DataContext
}

export const dataContext = createContext<DataContext>({} as DataContext)

export const useData = () => useContext(dataContext)

export default function DataProvider({children}: {children: ReactNode}) {
  const [data, setData] = useState<DataContext>({
    latestBlocks: [],
    vaults: [],
    monitor: {
      queues: [],
      db: {
        databaseSize: 0,
        indexHitRate: 0,
        cacheHitRate: 0,
        clients: 0
      },
      redis: {
        uptime: 0,
        clients: 0,
        memory: {
          total: 0,
          used: 0,
          peak: 0
        }
      }
    } as MonitorResults
  } as DataContext)

  useEffect(() => {
    let handle: NodeJS.Timeout
    const fetchAndKeepFetching = async () => {
      try {
        const data = await fetchData()
        setData(data)
      } finally {
        handle = setTimeout(fetchAndKeepFetching, 2_000)
      }
    }
    fetchAndKeepFetching()
    return () => clearTimeout(handle)
  }, [setData])

  return <dataContext.Provider value={data}>{children}</dataContext.Provider>
}
