'use client'

import React, { useEffect, useState } from 'react'
import Panel from './Panel'

interface LatestBlock {
  chainId: number,
  blockNumber: number,
  blockTimestamp: string,
  updatedAt: string
}

const GRAPHQL_API = 'http://localhost:3000/graphql'

const GRAPHQL_QUERY = `query LatestBlocks {
  latestBlocks {
    chainId
    blockNumber
    blockTimestamp
    updatedAt
    latency {
      blockToTable
    }
  }
}`

async function fetchLatestBlocks() {
  const response = await fetch(GRAPHQL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GRAPHQL_QUERY })
  })

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  return (await response.json()).data.latestBlocks
}

function useLatestBlocks() {
  const frequency = 1000;
  const [blocks, setBlocks] = useState<LatestBlock[]>([])

  useEffect(() => {
    const timer = setInterval(() => {
      fetchLatestBlocks()
      .then(data => setBlocks(data))
      .catch(error => console.error(error))
    }, 1000)
    return () => clearInterval(timer)
  }, [frequency])

  return blocks
}

export default function LatestBlock() {
  const blocks = useLatestBlocks()
  return <Panel>
    {blocks.map(block => <div key={block.chainId}>
      <div>chain id: {block.chainId}</div>
      <div>block number: {block.blockNumber}</div>
      <div>block timestamp: {block.blockTimestamp}</div>
    </div>)}
  </Panel>
}
