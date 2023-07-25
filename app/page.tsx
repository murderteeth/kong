'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import Prices, { Price } from '@/components/Prices'

const GRAPHQL_API = 'https://emerging-goose-65.hasura.app/v1/graphql'

const GRAPHQL_QUERY = `query Prices {
  price(limit: 100, where: {symbol: {_eq: "WETH"}}, order_by: {block_height: desc}) {
    symbol
    price_usd
    block_height
    block_timestamp
    timestamp
  }
}`

async function fetchPrices() {
  const response = await fetch(GRAPHQL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GRAPHQL_QUERY })
  })

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  return (await response.json()).data.price
}

function usePrices() {
  const [prices, setPrices] = useState<Price[]>([])
  useEffect(() => {
    fetchPrices()
      .then(data => setPrices(data))
      .catch(error => console.error(error))
  }, [setPrices])
  return prices
}

export default function Home() {
  const prices = usePrices()
  const latency = useMemo(() => {
    return prices.map(price => (new Date(price.timestamp)).getTime() - (new Date(price.block_timestamp)).getTime())
    .reduce((a, b) => a + b, 0) / prices.length
  }, [prices])

  return <main className="w-full min-h-screen flex items-center justify-center sm:gap-16">
    <div className="hidden sm:block relative w-1/2 min-h-screen">
      <Image src="/kong.png" fill={true} alt="Kong" />
    </div>
    <div className="w-full sm:w-1/2 p-4 sm:p-0 flex flex-col items-start justify-center gap-2">
      <div className="pb-2 text-8xl text-yellow-500 font-bold">Kong</div>
      <div className="text-xl">Real-time and historical ZooTroop GraphQL API</div>
      <a href="https://github.com/murderteeth/kong">https://github.com/murderteeth/kong</a>
      <div className="w-fit flex flex-col gap-8">
        <div className=" h-[300px]">
          <Prices prices={prices} />
        </div>
        <div className={'p-4 whitespace-pre font-mono text-xs rounded border border-red-950 text-red-400'}>
          {GRAPHQL_QUERY}
        </div>
        <div className="font-mono text-sm text-red-900">Block to Table Latency: {(latency / 1000).toFixed(4)}s</div>
      </div>
    </div>
  </main>
}
