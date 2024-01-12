'use client'

import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_CONTEXT, DataContext } from './types'
import useSWR from 'swr'

const endpoint = process.env.NEXT_PUBLIC_GQL || '/api/gql'

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
    defaultQueue {
      name
      address
      apyNet
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

export const dataContext = createContext<DataContext>(DEFAULT_CONTEXT)

export const useData = () => useContext(dataContext)

export default function DataProvider({children}: {children: ReactNode}) {
  const [data, setData] = useState<DataContext>(DEFAULT_CONTEXT)

  const { data: status } = useSWR(
    `${endpoint}?status`,
    (...args) => fetch(...args, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: STATUS_QUERY
      })
    }).then(res => res.json()),
    { refreshInterval: 10_000 }
  )

  const { data: vault } = useSWR(
    `${endpoint}?vault`,
    (...args) => fetch(...args, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: VAULT_QUERY,
        variables: { chainId: 137, address: '0xA013Fbd4b711f9ded6fB09C1c0d358E2FbC2EAA0' }
      })
    }).then(res => res.json()),
    { refreshInterval: 10_000 }
  )

  useEffect(() => {
    setData({...DEFAULT_CONTEXT, ...vault?.data, ...status?.data})
  }, [status, vault, setData])

  return <dataContext.Provider value={data}>{children}</dataContext.Provider>
}
