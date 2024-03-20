'use client'

import { useData } from '@/hooks/useData'
import Panel from './Panel'
import { fEvmAddress, fPercent, fUSD } from '@/lib/format'
import Frosty from './Frosty'
import Minibars from './Minibars'
import Linechart, { formatters } from './Linechart'

export default function Vault() {
  const { vault, tvls, apys } = useData()
  if (!(vault && vault.address)) return null

  const tvl = vault.sparklines.tvl.length > 0
  ? vault.sparklines.tvl[vault.sparklines.tvl.length - 1].close
  : 0

  const apy = vault.sparklines.apy.length > 0
  ? vault.sparklines.apy[vault.sparklines.apy.length - 1].close
  : 0

  return <Panel className="w-full flex flex-col gap-1 border border-yellow-950/50">
    <div className="flex items-center justify-between">
      <div className="font-bold text-xl">{vault.name}</div>
      <div className="text-sm text-yellow-700">{fEvmAddress(vault.address)}</div>
    </div>

    <div className="my-1 flex items-center justify-between">
      <div className="flex items-center gap-3 font-bold text-lg">
        <div>{'APY'}</div>
        <Minibars series={vault.sparklines.apy.map(s => s.close)} className="h-5" />
      </div>
      <div className="flex items-center gap-3">
        <Frosty _key={`vault-tvl-${fPercent(apy)}`}
          disabled={!Number.isFinite(apy)}
          className={'text-2xl'}>
          {fPercent(apy)}
        </Frosty>
      </div>
    </div>

    <div className="my-1 flex items-center justify-between">
      <div className="flex items-center gap-3 font-bold text-lg">
        <div>{'TVL'}</div>
        <Minibars series={vault.sparklines.tvl.map(s => s.close)} className="h-5" />
      </div>
      <div className="flex items-center gap-3">
        <Frosty _key={`vault-tvl-${fUSD(tvl)}`}
          disabled={!Number.isFinite(tvl)}
          className={'text-2xl'}>
          {fUSD(tvl, { fixed: 2 })}
        </Frosty>
      </div>
    </div>

    <div className="flex items-center justify-between">
      <div className="text-sm">{'Withdrawal Queue'}</div>
    </div>

    <div className="h-96">
      <Linechart title={'30d APY'} series={apys.map(apy => apy.value)} formatter={formatters.percent} />
    </div>

    {/* <div className="h-48">
      <Linechart title={'30d TVL'} series={tvls.map(tvl => tvl.value)} formatter={formatters.usd} />
    </div> */}

  </Panel>
}
