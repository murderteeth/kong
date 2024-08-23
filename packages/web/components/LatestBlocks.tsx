'use client'

import React, { useCallback } from 'react'
import chains from '../chains'
import Frosty from './Frosty'
import { useData } from '@/hooks/useData'

export default function LatestBlocks() {
  const data = useData()
  const latestBlock = useCallback((chainId: number) => {
    return data.latestBlocks.find(block => block.chainId === chainId)?.blockNumber.toString() || '--------'
  }, [data])
  return <div className={'w-full flex flex-col items-start'}>
    <div className="font-bold text-xl">Latest Blocks</div>
    {chains.map((chain, index) => <div key={chain.id} className="w-full flex items-center justify-between text-lg">
      <div className="text-yellow-700 whitespace-nowrap">{chain.name.toLowerCase()}</div>
      <Frosty _key={latestBlock(chain.id) as string}>{latestBlock(chain.id)}</Frosty>
    </div>)}
  </div>
}
