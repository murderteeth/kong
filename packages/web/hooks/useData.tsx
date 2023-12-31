'use client'

import { ReactNode, createContext, useContext, useEffect, useState } from 'react'

export interface LatestBlock {
  chainId: number
  blockNumber: number
}

export interface Vault {
  chainId: number
  address: string
  name: string
  apiVersion: string
  apetaxType: string
  apetaxStatus: string
  registryStatus: string
  tvlUsd: number
  tvlSparkline: {
    time: number
    value: number
  }[]
  apyNet: number
  apySparkline: {
    time: number
    value: number
  }[]
  withdrawalQueue: {
    name: string
    address: string
    netApr: number
  }[]
}

export interface TVL {
  open: number
  high: number
  low: number
  close: number
  period: string
  time: number
}

export interface APY {
  average: number
  period: string
  time: number
}

export interface Transfer {
  chainId: number
  address: string
  sender: string
  receiver: string
  amountUsd: number
  blockTime: string
  transactionHash: string
}

export interface Harvest {
  chainId: number
  address: string
  lossUsd: number
  profitUsd: number
  blockTime: string
  transactionHash: string
}

export interface Monitor {
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

  ingest: {
    cpu: {
      usage: number
    }
    memory: {
      total: number
      used: number
    }
  }

  stats: {
    total: number
    endorsed: number
    experimental: number
    networks: {
      chainId: number
      count: number
    }[]
    apetax: {
      stealth: number
      new: number
      active: number
      withdraw: number
    }
  }
}

export interface DataContext {
  latestBlocks: LatestBlock[]
  vault: Vault
  tvls: TVL[]
  apys: APY[]
  transfers: Transfer[]
  harvests: Harvest[]
  monitor: Monitor
}

const STATUS_QUERY = `query Data {
  latestBlocks {
    chainId
    blockNumber
  }

  monitor {
    queues {
      name
      waiting
      active
      failed
    }

    redis {
      version
      mode
      os
      uptime
      clients
      memory {
        total
        used
        peak
        fragmentation
      }
    }

    db {
      clients
      databaseSize
      indexHitRate
      cacheHitRate
    }

    ingest {
      cpu {
        usage
      }
      memory {
        total
        used
      }
    }

    stats {
      total
      endorsed
      experimental
      networks {
        chainId
        count
      }
      apetax {
        stealth
        new
        active
        withdraw
      }
    }
  }
}`

const VAULT_QUERY = `query Data($chainId: Int!, $address: String!) {
  vault(chainId: $chainId, address: $address) {
    chainId
    address
    name
    apetaxStatus
    apetaxType
    apiVersion
    registryStatus
    tvlUsd
    tvlSparkline {
      value
      time
    }
    apyNet
    apySparkline {
      value
      time
    }
    withdrawalQueue {
      name
      address
      netApr
    }
  }

  tvls(chainId: $chainId, address: $address) {
    open
    high
    low
    close
    period
    time
  }

  apys(chainId: $chainId, address: $address) {
    average
    period
    time
  }

  transfers {
    chainId
    address
    sender
    receiver
    amountUsd
    blockTime
    transactionHash
  }

  harvests {
    chainId
    address
    lossUsd
    profitUsd
    blockTime
    transactionHash
  }
}`

async function fetchData() {
  const endpoint = process.env.NEXT_PUBLIC_GQL || '/api/gql'

  const statusResponsePromise = fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: STATUS_QUERY
    })
  })

  const vaultResponsePromise = fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query: VAULT_QUERY,
      variables: { chainId: 1, address: '0xa258C4606Ca8206D8aA700cE2143D7db854D168c' }
    })
  })

  const [statusResponse, vaultResponse] = await Promise.all([statusResponsePromise, vaultResponsePromise])

  if (!statusResponse.ok) throw new Error(`HTTP error! status: ${statusResponse.status}`)
  if (!vaultResponse.ok) throw new Error(`HTTP error! status: ${vaultResponse.status}`)

  return {
    ...(await statusResponse.json()).data, 
    ...(await vaultResponse.json()).data
  } as DataContext
}

const DEFAULT = {
  latestBlocks: [],
  vault: {} as Vault,
  tvls: [],
  apys: [],
  transfers: [],
  harvests: [],
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
    },
    ingest: {
      cpu: {
        usage: 0
      },
      memory: {
        total: 0,
        used: 0
      }
    },
    stats: {
      total: 0,
      endorsed: 0,
      experimental: 0,
      networks: [],
      apetax: {
        stealth: 0,
        new: 0,
        active: 0,
        withdraw: 0
      }
    }
  } as Monitor
} as DataContext

export const dataContext = createContext<DataContext>(DEFAULT)

export const useData = () => useContext(dataContext)

export default function DataProvider({children}: {children: ReactNode}) {
  const [data, setData] = useState<DataContext>(DEFAULT)

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
