'use client'

import React from 'react'

import figlet from 'figlet'
// @ts-ignore
import font from 'figlet/importable-fonts/Cyberlarge.js'
figlet.parseFont('Cyberlarge', font)

export default function Ahoy() {
  const wordmark = figlet.textSync('KONG', { font: 'Cyberlarge' })
  return <div className="w-full flex items-start gap-0">
    <div className="w-full flex flex-col items-center sm:items-start gap-2">
      <div className="-mb-6 flex items-start gap-2 sm:gap-0">
        <div className="pt-16 -mr-16 sm:-mr-12 text-xl whitespace-nowrap rotate-90">{'(|:(|)'}</div>
        <div className="text-lg whitespace-pre">{wordmark}</div>
      </div>
      <p className="text-sm">Real-time/historical EVM indexer x Analytics</p>
      <a href="https://github.com/murderteeth/kong" target="_blank" className="text-xs">{'/github.com/murderteeth/kong'}</a>
      <a href="/api/gql" target="_blank" className="text-xs">{'/api/gql'}</a>
    </div>
  </div>
}
