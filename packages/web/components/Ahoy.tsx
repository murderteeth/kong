'use client'

import React from 'react'
import Panel from './Panel'

import figlet from 'figlet'
// @ts-ignore
import font from 'figlet/importable-fonts/Cyberlarge.js'
figlet.parseFont('Cyberlarge', font)

export default function Ahoy() {
  const wordmark = figlet.textSync('KONG', { font: 'Cyberlarge' })
  return <Panel className="w-full flex items-start gap-2">
    <div className="w-full flex flex-col items-center sm:items-start gap-2">
      <div className="flex items-start gap-2">
        <div className="pt-16 -mr-16 sm:-mr-12 text-xl whitespace-nowrap rotate-90">{'(|:(|)'}</div>
        <div className="text-lg whitespace-pre">{wordmark}</div>
      </div>
      <a href="https://github.com/murderteeth/kong" target="_blank" className="text-xs">{'https://github.com/murderteeth/kong'}</a>
    </div>
  </Panel>
}
