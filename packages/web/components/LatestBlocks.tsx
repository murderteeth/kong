'use client'

import React, { useCallback, useEffect, useState } from 'react'
import chains from '../chains'
import Panel from './Panel'
import Frosty from './Frosty'
import Connector from './Connector'

interface LatestBlock {
  chainId: number,
  blockNumber: number
}

const GRAPHQL_QUERY = `query LatestBlocks {
  latestBlocks {
    chainId
    blockNumber
  }
}`

async function fetchLatestBlocks() {
  const response = await fetch(process.env.NEXT_PUBLIC_GQL || 'http://localhost:3001/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GRAPHQL_QUERY })
  })

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  return (await response.json()).data.latestBlocks
}

function useLatestBlocks() {
  const frequency = 1000
  const [results, setResults] = useState<LatestBlock[]>([])

  useEffect(() => {
    const timer = setInterval(() => {
      fetchLatestBlocks().then(data => setResults(data))
    }, frequency)
    return () => clearInterval(timer)
  }, [])

  return results
}

export default function LatestBlocks() {
  const blocks = useLatestBlocks()
  const latestBlock = useCallback((chainId: number) => {
    return blocks.find(block => block.chainId === chainId)?.blockNumber || '--------'
  }, [blocks])
  return <Panel className={'w-full flex flex-col items-start'}>
    <div className="font-bold text-lg">Latest Blocks</div>
    {chains.map((chain, index) => <div key={chain.id} className="w-full flex items-center justify-between text-sm">
      <div className="whitespace-nowrap">{chain.name.toLowerCase()}</div>
      <Connector name={chain.name} index={index} padding={{ default: 0, sm: 56}} />
      <Frosty _key={latestBlock(chain.id) as string}>{latestBlock(chain.id)}</Frosty>
    </div>)}
  </Panel>
}
