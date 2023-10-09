'use client'

import React from 'react'
import Panel from './Panel'
import { Harvest, useData } from '@/hooks/useData'
import { fEvmAddress, fUSD } from '@/util/format'
import ReactTimeago from 'react-timeago'

function HarvestComponent({ harvest }: { harvest: Harvest }) {
  if(!harvest) return null

  return <div className="w-full flex flex-col items-center justify-between">

    <div className="w-full flex items-center justify-between">
      <div className="text-xs">{'chain'}</div>
      <div className="text-xs text-yellow-700">{harvest.chainId}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-xs">{'strategy'}</div>
      <div className="text-xs text-yellow-700">{fEvmAddress(harvest.address)}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-xs">{'profit'}</div>
      <div className="text-xs text-yellow-700">{fUSD(harvest.profitUsd)}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-xs">{'loss'}</div>
      <div className="text-xs text-yellow-700">{fUSD(harvest.lossUsd)}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-xs">{'tx hash'}</div>
      <div className="text-xs text-yellow-700">{fEvmAddress(harvest.transactionHash)}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-xs">{'time'}</div>
      <div className="text-xs text-yellow-700">
        <ReactTimeago date={Number(harvest.blockTime)} />
      </div>
    </div>
  </div>
}

export default function Harvests({ className }: { className?: string }) {
  const { harvests } = useData()
  return <Panel className={`flex flex-col ${className}`}>
    <div className="font-bold text-lg">Harvests</div>
    <div className="grow overflow-auto flex flex-col gap-3">
      {harvests.map((harvest, index) => 
        <HarvestComponent key={index} harvest={harvest} />
      )}
    </div>
  </Panel>
}
