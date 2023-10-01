'use client'

import { useData } from '@/hooks/useData'
import Panel from './Panel'
import { fEvmAddress, fUSD } from '@/util/format'

export default function Vault() {
  const { vaults } = useData()
  const address = '0xa258C4606Ca8206D8aA700cE2143D7db854D168c'
  const vault = vaults.find(v => v.address === address)
  if (!vault) return null

  return <Panel className="border border-yellow-950">
    <div className="flex items-center justify-between">
      <div className="font-bold text-lg">{vault.name}</div>
      <div className="text-sm">{fEvmAddress(vault.address)}</div>
    </div>
    <div className="flex items-center justify-between">
      <div className="font-bold">{'TVL'}</div>
      <div className="text-sm">{fUSD(vault.tvlUsd)}</div>
    </div>


  </Panel>
}
