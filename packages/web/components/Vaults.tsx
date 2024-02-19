'use client'

import React, { useMemo } from 'react'
import chains from '../chains'
import Panel from './Panel'
import Frosty from './Frosty'
import { useData } from '@/hooks/useData'

export default function Vaults() {
  const { monitor } = useData()
  const { stats } = monitor

  function pad(value: number) {
    return value.toString().padStart(3, '0')
  }

  return <Panel className={'w-full flex flex-col items-start'}>
    <div className="w-full flex items-center justify-between">
      <div className="font-bold text-lg">Yearn vaults</div>
      <Frosty _key={`total-${stats.total}`} disabled={stats.total < 1}>{pad(stats.total)}</Frosty>
    </div>

    <div className="w-full flex items-center justify-between text-sm">
      <div>endorsed</div>
      <Frosty _key={`endorsed-${stats.endorsed}`} disabled={stats.endorsed < 1}>{pad(stats.endorsed)}</Frosty>
    </div>

    <div className="w-full flex items-center justify-between text-sm">
      <div>experimental</div>
      <Frosty _key={`experimental-${stats.experimental}`} disabled={stats.experimental < 1}>{pad(stats.experimental)}</Frosty>
    </div>

    {chains.map((chain, index) => <div key={chain.id} className="w-full flex items-center justify-between text-xs">
      <div className="whitespace-nowrap">{chain.name.toLowerCase()}</div>
      <Frosty _key={`${chain.id}-${stats.networks.find(n => n.chainId === chain.id)?.count}`}
        disabled={(stats.networks.find(n => n.chainId === chain.id)?.count || 0) < 1}>
        {pad(stats.networks.find(n => n.chainId === chain.id)?.count || 0)}
      </Frosty>
    </div>)}

    {/* <div className="w-full flex items-center justify-between text-xs">
      <div>apetax</div>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Frosty _key={`apetax-s-${stats.apetax.stealth}`} disabled={stats.apetax.stealth < 1}>{`s ${pad(stats.apetax.stealth)}`}</Frosty>
        <Frosty _key={`apetax-n-${stats.apetax.new}`} disabled={stats.apetax.new < 1}>{`n ${pad(stats.apetax.new)}`}</Frosty>
        <Frosty _key={`apetax-a-${stats.apetax.active}`} disabled={stats.apetax.active < 1}>{`a ${pad(stats.apetax.active)}`}</Frosty>
        <Frosty _key={`apetax-w-${stats.apetax.withdraw}`} disabled={stats.apetax.withdraw < 1}>{`w ${pad(stats.apetax.withdraw)}`}</Frosty>
      </div>
    </div> */}
  </Panel>
}
