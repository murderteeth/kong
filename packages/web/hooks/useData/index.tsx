'use client'

import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { DEFAULT_CONTEXT, DataContext, DataContextSchema } from './types'
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
    apiVersion
    sparklines {
      tvl {
        close
        blockTime
      }
      apy {
        close
        blockTime
      }
    }
  }

  tvls: timeseries(chainId: $chainId, address: $address, label: "tvl", component: "tvl") {
    chainId
    address
    label
    component
    value
    period
    time
  }

  apys: timeseries(chainId: $chainId, address: $address, label: "apy-bwd-delta-pps", component: "net") {
    chainId
    address
    label
    component
    value
    period
    time
  }

  transfers {
    chainId
    address
    sender
    receiver
    valueUsd
    blockTime
    transactionHash
  }

  strategyReports {
    chainId
    address
    profit
    profitUsd
    loss
    lossUsd
    apr {
      gross
      net
    }
    blockNumber
    blockTime
    transactionHash
  }
}`

export const dataContext = createContext<DataContext>(DEFAULT_CONTEXT)

export const useData = () => useContext(dataContext)

export default function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DataContext>(DEFAULT_CONTEXT)

  const { data: status } = useSWR(
    `${endpoint}?status`,
    (...args) => fetch(...args, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: STATUS_QUERY
      })
    }).then(res => res.json()).catch(reason => {
      console.error(reason)
      return {}
    }),
    { refreshInterval: parseInt(process.env.NEXT_PUBLIC_DASH_REFRESH || '10_000') }
  )

  const { data: vault } = useSWR(
    `${endpoint}?vault`,
    (...args) => fetch(...args, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query: VAULT_QUERY,
        variables: { chainId: 137, address: '0x305F25377d0a39091e99B975558b1bdfC3975654' }
      })
    }).then(res => res.json()).catch(reason => {
      console.error(reason)
      return {}
    }),
    { refreshInterval: parseInt(process.env.NEXT_PUBLIC_DASH_REFRESH || '10_000') }
  )

  useEffect(() => {
    const update = DataContextSchema.parse({
      ...DEFAULT_CONTEXT,
      ...vault?.data,
      ...status?.data
    })
    setData(update)
  }, [status, vault, setData])

  return <dataContext.Provider value={data}>{children}</dataContext.Provider>
}
