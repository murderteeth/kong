'use client'

import { useData } from '@/hooks/useData'
import Panel from './Panel'
import { fEvmAddress, fPercent, fUSD } from '@/util/format'
import Frosty from './Frosty'
import Minibars from './Minibars'
import { useMemo } from 'react'
import Linechart from './Linechart'

export default function Vault() {
  const { vaults, tvls } = useData()
  const address = '0xa258C4606Ca8206D8aA700cE2143D7db854D168c'
  const vault = useMemo(() => vaults.find(v => v.address === address), [vaults])
  if (!vault) return null

  return <Panel className="w-full flex flex-col gap-1 border border-yellow-950/50">
    <div className="flex items-center justify-between">
      <div className="font-bold text-xl">{vault.name}</div>
      <div className="text-sm text-yellow-700">{fEvmAddress(vault.address)}</div>
    </div>

    <div className="my-1 flex items-center justify-between">
      <div className="flex items-center gap-3 font-bold text-lg">
        <div>{'TVL'}</div>
        <Minibars series={vault.tvlSparkline.map(s => s.value)} className="h-5" />
      </div>
      <div className="flex items-center gap-3">
        <Frosty _key={`vault-tvl-${fUSD(vault.tvlUsd)}`}
          disabled={!Number.isFinite(vault.tvlUsd)}
          className={'text-2xl'}>
          {fUSD(vault.tvlUsd, { fixed: 2 })}
        </Frosty>
      </div>
    </div>

    <div className="flex items-center justify-between">
      <div className="text-sm">{'Withdrawal Queue'}</div>
    </div>
    {vault.withdrawalQueue.map((strategy, index) => 
      <div key={index} className="flex items-center justify-between">
        <div className="text-sm">{strategy.name}</div>
        <Frosty _key={`vault-tvl-${fPercent(strategy.netApr)}`}
          className={'text-sm'}>
          {`APR ${fPercent(strategy.netApr)}`}
        </Frosty>
      </div>
    )}

    <div className="h-48">
      <Linechart title={'30d TVL'} series={tvls.map(tvl => tvl.close)} />
    </div>

  </Panel>
}
