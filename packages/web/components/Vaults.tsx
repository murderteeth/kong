'use client'

import React, { useEffect, useMemo, useState } from 'react'
import chains from '../chains'
import Panel from './Panel'
import Frosty from './Frosty'
import Connector from './Connector'

interface Vault {
  chainId: number
  address: string
  apiVersion: string
  apetaxType: string
  apetaxStatus: string
  registryStatus: string
}

const GRAPHQL_QUERY = `query Vaults {
  vaults {
    chainId
    address
    apetaxStatus
    apetaxType
    apiVersion
    registryStatus
  }
}`

async function fetchVaults() {
  const response = await fetch(process.env.NEXT_PUBLIC_GQL || 'http://localhost:3001/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GRAPHQL_QUERY })
  })

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  return (await response.json()).data.vaults
}

function useVaults() {
  const frequency = 1000
  const [results, setResults] = useState<Vault[]>([])

  useEffect(() => {
    const timer = setInterval(() => {
      fetchVaults().then(data => setResults(data))
    }, frequency)
    return () => clearInterval(timer)
  }, [])

  return results
}

export default function Vaults() {
  const vaults = useVaults()
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
      <Frosty _key={`total-${vaults.length}`}>{pad(vaults.length)}</Frosty>
    </div>

    <div className="w-full flex items-center justify-between text-sm">
      <div>endorsed</div>
      <Connector name={'endorsed'} index={0} padding={{ default: 0, sm: 62}} />
      <Frosty _key={`endorsed-${endorsed}`}>{pad(endorsed)}</Frosty>
    </div>

    <div className="w-full flex items-center justify-between text-sm">
      <div>experimental</div>
      <Connector name={'experimental'} index={1} padding={{ default: 0, sm: 62}} />
      <Frosty _key={`experimental-${experimental}`}>{pad(experimental)}</Frosty>
    </div>

    {chains.map((chain, index) => <div key={chain.id} className="w-full flex items-center justify-between text-xs">
      <div className="whitespace-nowrap">{chain.name.toLowerCase()}</div>
      <Connector name={chain.name} index={2 + index} padding={{ default: 0, sm: 72}} />
      <Frosty _key={`${chain.id}-${vaults.filter(v => v.chainId === chain.id).length}`}>
        {pad(vaults.filter(v => v.chainId === chain.id).length)}
      </Frosty>
    </div>)}

    <div className="w-full flex items-center justify-between text-xs">
      <div>apetax</div>
      <Connector name={'apetax'} index={chains.length} padding={{ default: 0, sm: 52}} />
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Frosty _key={`apetax-s-${apetax.stealth}`}>{`s ${pad(apetax.stealth)}`}</Frosty>
        <Frosty _key={`apetax-n-${apetax.new}`}>{`n ${pad(apetax.new)}`}</Frosty>
        <Frosty _key={`apetax-a-${apetax.active}`}>{`a ${pad(apetax.active)}`}</Frosty>
        <Frosty _key={`apetax-w-${apetax.withdraw}`}>{`w ${pad(apetax.withdraw)}`}</Frosty>
      </div>
    </div>
  </Panel>
}
