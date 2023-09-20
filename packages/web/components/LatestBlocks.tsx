'use client'

import React, { use, useCallback, useEffect, useState } from 'react'
import chains from '../chains'
import Panel from './Panel'
import Frosty from './Frosty'
import Connector from './Connector'
import { useData } from '@/hooks/useData'

export default function LatestBlocks() {
  const { latestBlocks } = useData()
  const latestBlock = useCallback((chainId: number) => {
    return latestBlocks.find(block => block.chainId === chainId)?.blockNumber || '--------'
  }, [latestBlocks])
  return <Panel className={'w-full flex flex-col items-start'}>
    <div className="font-bold text-lg">Latest Blocks</div>
    {chains.map((chain, index) => <div key={chain.id} className="w-full flex items-center justify-between text-sm">
      <div className="whitespace-nowrap">{chain.name.toLowerCase()}</div>
      <Connector name={chain.name} index={index} padding={{ default: 0, sm: 56}} />
      <Frosty _key={latestBlock(chain.id) as string}>{latestBlock(chain.id)}</Frosty>
    </div>)}
  </Panel>
}
