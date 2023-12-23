'use client'

import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_CONTEXT, DataContext, DataContextSchema } from './types'

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
      variables: { chainId: 137, address: '0xA013Fbd4b711f9ded6fB09C1c0d358E2FbC2EAA0' }
    })
  })

  const [statusResponse, vaultResponse] = await Promise.all([statusResponsePromise, vaultResponsePromise])

  if (!statusResponse.ok) throw new Error(`HTTP error! status: ${statusResponse.status}`)
  if (!vaultResponse.ok) throw new Error(`HTTP error! status: ${vaultResponse.status}`)

  const status = (await statusResponse.json()).data
  const vault = (await vaultResponse.json()).data

  return DataContextSchema.parse({
    ...status,
    ...vault
  }) as DataContext
}

export const dataContext = createContext<DataContext>(DEFAULT_CONTEXT)

export const useData = () => useContext(dataContext)

export default function DataProvider({children}: {children: ReactNode}) {
  const [data, setData] = useState<DataContext>(DEFAULT_CONTEXT)

  useEffect(() => {
    let handle: NodeJS.Timeout
    const fetchAndKeepFetching = async () => {
      try {
        const data = await fetchData()
        setData(data)
      } finally {
        handle = setTimeout(fetchAndKeepFetching, 10_000)
      }
    }
    fetchAndKeepFetching()
    return () => clearTimeout(handle)
  }, [setData])

  return <dataContext.Provider value={data}>{children}</dataContext.Provider>
}
