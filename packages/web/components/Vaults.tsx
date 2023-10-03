'use client'

import React, { useMemo } from 'react'
import chains from '../chains'
import Panel from './Panel'
import Frosty from './Frosty'
import { useData } from '@/hooks/useData'

export default function Vaults() {
  const { vaults } = useData()
  const apetax = useMemo(() => ({
    stealth: vaults.filter(v => v.apetaxStatus === 'stealth').length,
    new: vaults.filter(v => v.apetaxStatus === 'new').length,
    active: vaults.filter(v => v.apetaxStatus === 'active').length,
    withdraw: vaults.filter(v => v.apetaxStatus === 'withdraw').length,
  }), [vaults])
  const experimental = useMemo(() => vaults.filter(v => v.registryStatus === 'experimental').length, [vaults])
  const endorsed = useMemo(() => vaults.filter(v => v.registryStatus === 'endorsed').length, [vaults])

  function pad(value: number) {
    return value.toString().padStart(3, '0')
  }

  return <Panel className={'w-full flex flex-col items-start'}>
    <div className="w-full flex items-center justify-between">
      <div className="font-bold text-lg">Yearn vaults</div>
      <Frosty _key={`total-${vaults.length}`} disabled={vaults.length < 1}>{pad(vaults.length)}</Frosty>
    </div>

    <div className="w-full flex items-center justify-between text-sm">
      <div>endorsed</div>
      <Frosty _key={`endorsed-${endorsed}`} disabled={endorsed < 1}>{pad(endorsed)}</Frosty>
    </div>

    <div className="w-full flex items-center justify-between text-sm">
      <div>experimental</div>
      <Frosty _key={`experimental-${experimental}`} disabled={experimental < 1}>{pad(experimental)}</Frosty>
    </div>

    {chains.map((chain, index) => <div key={chain.id} className="w-full flex items-center justify-between text-xs">
      <div className="whitespace-nowrap">{chain.name.toLowerCase()}</div>
      <Frosty _key={`${chain.id}-${vaults.filter(v => v.chainId === chain.id).length}`}
       disabled={vaults.filter(v => v.chainId === chain.id).length < 1}>
        {pad(vaults.filter(v => v.chainId === chain.id).length)}
      </Frosty>
    </div>)}

    <div className="w-full flex items-center justify-between text-xs">
      <div>apetax</div>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Frosty _key={`apetax-s-${apetax.stealth}`} disabled={apetax.stealth < 1}>{`s ${pad(apetax.stealth)}`}</Frosty>
        <Frosty _key={`apetax-n-${apetax.new}`} disabled={apetax.new < 1}>{`n ${pad(apetax.new)}`}</Frosty>
        <Frosty _key={`apetax-a-${apetax.active}`} disabled={apetax.active < 1}>{`a ${pad(apetax.active)}`}</Frosty>
        <Frosty _key={`apetax-w-${apetax.withdraw}`} disabled={apetax.withdraw < 1}>{`w ${pad(apetax.withdraw)}`}</Frosty>
      </div>
    </div>
  </Panel>
}
