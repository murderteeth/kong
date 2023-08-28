'use client'

import React from 'react'
import Panel from './Panel'

import figlet from 'figlet'
// @ts-ignore
import font from 'figlet/importable-fonts/Cyberlarge.js'
figlet.parseFont('Cyberlarge', font);

export default function Ahoy() {
  const wordmark = figlet.textSync('KONG', { font: 'Cyberlarge' })
  return <Panel className={'w-full flex flex-col items-center sm:items-start gap-2'}>
    <div className="text-lg whitespace-pre">{wordmark}</div>
    <p className="text-xs">Real-time and historical ZooTroop GraphQL API</p>
    <a href="https://github.com/murderteeth/kong" target="_blank" className="text-xs">{'https://github.com/murderteeth/kong'}</a>
  </Panel>
}
