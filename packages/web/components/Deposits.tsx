'use client'

import React, { useMemo } from 'react'
import Panel from './Panel'
import { useData } from '@/hooks/useData'
import { zeroAddress } from 'viem'
import { fEvmAddress, fUSD } from '@/util/format'
import ReactTimeago from 'react-timeago'
import { Transfer } from '@/hooks/useData/types'

function TransferComponent({ transfer }: { transfer: Transfer }) {
  const isDeposit = useMemo(() => transfer.sender === zeroAddress, [transfer])
  const label = useMemo(() => isDeposit ? '[+] deposit' : '[-] withdrawal', [isDeposit])
  const address = useMemo(() => isDeposit ? transfer.receiver : transfer.sender, [isDeposit, transfer])
  const labelColor = useMemo(() => isDeposit ? 'text-green-500' : 'text-red-500', [isDeposit])
  const amountColor = useMemo(() => isDeposit ? 'text-green-700' : 'text-red-700', [isDeposit])

  return <div className="w-full flex flex-col items-center justify-between">
    <div className="w-full flex items-center justify-between">
      <div className={`text-xs ${labelColor}`}>{label}</div>
      <div className={amountColor}>{fUSD(transfer.amountUsd || NaN, { fixed: 2 })}</div>
    </div>
    <div className="w-full flex items-center justify-between">
      <div className={`text-xs ${labelColor}`}>{'chain'}</div>
      <div className={`text-xs ${amountColor}`}>{transfer.chainId}</div>
    </div>
    <div className="w-full flex items-center justify-between">
      <div className={`text-xs ${labelColor}`}>{'vault'}</div>
      <div className={`text-xs ${amountColor}`}>{fEvmAddress(transfer.address)}</div>
    </div>
    <div className="w-full flex items-center justify-between">
      <div className={`text-xs ${labelColor}`}>{'address'}</div>
      <div className={`text-xs ${amountColor}`}>{fEvmAddress(address)}</div>
    </div>
    <div className="w-full flex items-center justify-between">
      <div className={`text-xs ${labelColor}`}>{'tx hash'}</div>
      <div className={`text-xs ${amountColor}`}>{fEvmAddress(transfer.transactionHash)}</div>
    </div>
    <div className="w-full flex items-center justify-between">
      <div className={`text-xs ${labelColor}`}>{'time'}</div>
      <div className={`text-xs ${amountColor}`}>
        <ReactTimeago date={Number(transfer.blockTime)} />
      </div>
    </div>
  </div>
}

export default function Deposits({ className }: { className?: string }) {
  const { transfers } = useData()
  return <Panel className={`flex flex-col ${className}`}>
    <div className="font-bold text-lg">Deposits x Withdrawals</div>
    <div className={`grow pr-1 flex flex-col gap-2
      overflow-y-auto sm:scrollbar-thin 
      sm:scrollbar-thumb-yellow-700 
      sm:hover:scrollbar-thumb-yellow-400 
      sm:scrollbar-track-green-950`}>
      {transfers.map((transfer, index) => 
        transfer ? <TransferComponent key={index} transfer={transfer} /> : <></>
      )}
    </div>
  </Panel>
}
