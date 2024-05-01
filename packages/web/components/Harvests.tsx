'use client'

import React from 'react'
import Panel from './Panel'
import { useData } from '@/hooks/useData'
import { fEvmAddress, fPercent, fUSD } from '@/lib/format'
import ReactTimeago from 'react-timeago'
import { Harvest } from '@/hooks/useData/types'

function HarvestComponent({ harvest }: { harvest: Harvest }) {
  if(!harvest) return null

  return <div className="w-full flex flex-col items-center justify-between">

    <div className="w-full flex items-center justify-between">
      <div className="text-yellow-700 text-xs">{'chain'}</div>
      <div className="text-xs text-yellow-700">{harvest.chainId}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-yellow-700 text-xs">{'strategy'}</div>
      <div className="text-xs text-yellow-700">{fEvmAddress(harvest.address)}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-yellow-700 text-xs">{'profit'}</div>
      <div className="text-xs text-yellow-700">{fUSD(harvest.profitUsd || 0)}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-yellow-700 text-xs">{'loss'}</div>
      <div className="text-xs text-yellow-700">{fUSD(harvest.lossUsd || 0)}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-yellow-700 text-xs">{'apr'}</div>
      <div className="text-xs text-yellow-700">{fPercent(harvest.apr.net || 0)}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-yellow-700 text-xs">{'tx hash'}</div>
      <div className="text-xs text-yellow-700">{fEvmAddress(harvest.transactionHash)}</div>
    </div>

    <div className="w-full flex items-center justify-between">
      <div className="text-yellow-700 text-xs">{'time'}</div>
      <div className="text-xs text-yellow-700">
        <ReactTimeago date={Number(harvest.blockTime) * 1000} />
      </div>
    </div>
  </div>
}

export default function Harvests({ className }: { className?: string }) {
  const { strategyReports: harvests } = useData()
  return <Panel className={`flex flex-col ${className}`}>
    <div className="font-bold text-lg">Harvests</div>
    <div className={`grow pr-1 flex flex-col gap-3
      overflow-y-auto sm:scrollbar-thin 
      sm:scrollbar-thumb-yellow-700 
      sm:hover:scrollbar-thumb-yellow-400 
      sm:scrollbar-track-green-950`}>
      {harvests.map((harvest, index) => 
        <HarvestComponent key={index} harvest={harvest} />
      )}
    </div>
  </Panel>
}
