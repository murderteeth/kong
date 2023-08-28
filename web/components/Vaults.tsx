'use client'

import React, { useEffect, useMemo, useState } from 'react'
import chains from '../chains'
import Panel from './Panel'
import Frosty from './Frosty'

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
  const response = await fetch(process.env.GQL || 'http://localhost:3001/graphql', {
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
      <Frosty _key={`endorsed-${endorsed}`}>{pad(endorsed)}</Frosty>
    </div>

    <div className="w-full flex items-center justify-between text-sm">
      <div>experimental</div>
      <Frosty _key={`experimental-${experimental}`}>{pad(experimental)}</Frosty>
    </div>

    {chains.map(chain => <div key={chain.id} className="w-full flex items-center justify-between text-xs">
      <div>{chain.name.toLowerCase()}</div>
      <Frosty _key={`${chain.id}-${vaults.filter(v => v.chainId === chain.id).length}`}>
        {pad(vaults.filter(v => v.chainId === chain.id).length)}
      </Frosty>
    </div>)}

    <div className="w-full flex items-center justify-between text-xs">
      <div>apetax</div>
      <div className="flex items-center gap-2">
        <Frosty _key={`apetax-s-${apetax.stealth}`}>{`s ${pad(apetax.stealth)}`}</Frosty>
        <Frosty _key={`apetax-n-${apetax.new}`}>{`n ${pad(apetax.new)}`}</Frosty>
        <Frosty _key={`apetax-a-${apetax.active}`}>{`a ${pad(apetax.active)}`}</Frosty>
        <Frosty _key={`apetax-w-${apetax.withdraw}`}>{`w ${pad(apetax.withdraw)}`}</Frosty>
      </div>
    </div>
  </Panel>
}
