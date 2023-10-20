'use client'

import React, { useCallback } from 'react'
import chains from '../chains'
import Panel from './Panel'
import Frosty from './Frosty'
import { useData } from '@/hooks/useData'

export default function LatestBlocks() {
  const data = useData()
  const latestBlock = useCallback((chainId: number) => {
    return data.latestBlocks.find(block => block.chainId === chainId)?.blockNumber || '--------'
  }, [data])
  return <Panel className={'w-full flex flex-col items-start'}>
    <div className="font-bold text-lg">Latest Blocks</div>
    {chains.map((chain, index) => <div key={chain.id} className="w-full flex items-center justify-between text-sm">
      <div className="whitespace-nowrap">{chain.name.toLowerCase()}</div>
      <Frosty _key={latestBlock(chain.id) as string}>{latestBlock(chain.id)}</Frosty>
    </div>)}
  </Panel>
}
