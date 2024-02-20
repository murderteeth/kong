'use client'

import { useData } from '@/hooks/useData'
import Panel from './Panel'
import { fEvmAddress, fPercent, fUSD } from '@/util/format'
import Frosty from './Frosty'
import Minibars from './Minibars'
import Linechart, { formatters } from './Linechart'

export default function Vault() {
  const { vault, tvls, apys } = useData()
  if (!(vault && vault.address)) return null

  return <Panel className="w-full flex flex-col gap-1 border border-yellow-950/50">
    <div className="flex items-center justify-between">
      <div className="font-bold text-xl">{vault.name}</div>
      <div className="text-sm text-yellow-700">{fEvmAddress(vault.address)}</div>
    </div>

    <div className="my-1 flex items-center justify-between">
      <div className="flex items-center gap-3 font-bold text-lg">
        <div>{'APY'}</div>
        <Minibars series={vault.apySparkline.map(s => s.value)} className="h-5" />
      </div>
      <div className="flex items-center gap-3">
        <Frosty _key={`vault-tvl-${fPercent(vault.apyNet ?? 0)}`}
          disabled={!Number.isFinite(vault.tvlUsd)}
          className={'text-2xl'}>
          {fPercent(vault.apyNet ?? 0)}
        </Frosty>
      </div>
    </div>

    <div className="my-1 flex items-center justify-between">
      <div className="flex items-center gap-3 font-bold text-lg">
        <div>{'TVL'}</div>
        <Minibars series={vault.tvlSparkline.map(s => s.value)} className="h-5" />
      </div>
      <div className="flex items-center gap-3">
        <Frosty _key={`vault-tvl-${fUSD(vault.tvlUsd || 0)}`}
          disabled={!Number.isFinite(vault.tvlUsd)}
          className={'text-2xl'}>
          {fUSD(vault.tvlUsd || 0, { fixed: 2 })}
        </Frosty>
      </div>
    </div>

    <div className="flex items-center justify-between">
      <div className="text-sm">{'Withdrawal Queue'}</div>
    </div>
    {vault.defaultQueue.length > 0 && vault.defaultQueue.map((strategy, index) => 
      <div key={index} className="flex items-center justify-between">
        <div className="text-sm">{strategy.name}</div>
        <Frosty _key={`vault-tvl-${fPercent(strategy.apyNet)}`}
          className={'text-sm'}>
          {`APY ${fPercent(strategy.apyNet)}`}
        </Frosty>
      </div>
    )}

    {vault.withdrawalQueue.length > 0 && vault.withdrawalQueue.map((strategy, index) => 
      <div key={index} className="flex items-center justify-between">
        <div className="text-sm">{strategy.name}</div>
        <Frosty _key={`vault-tvl-${fPercent(strategy.netApr || 0)}`}
          className={'text-sm'}>
          {`APR ${fPercent(strategy.netApr || 0)}`}
        </Frosty>
      </div>
    )}

    <div className="h-48">
      <Linechart title={'30d APY'} series={apys.map(apy => apy.average)} formatter={formatters.percent} />
    </div>

    <div className="h-48">
      <Linechart title={'30d TVL'} series={tvls.map(tvl => tvl.close)} formatter={formatters.usd} />
    </div>

  </Panel>
}
