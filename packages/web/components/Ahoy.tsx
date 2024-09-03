'use client'

import React from 'react'
import Image from 'next/image'
import figureImage from '@/app/figure.png'
import figlet from 'figlet'
// @ts-ignore
import font from 'figlet/importable-fonts/Cyberlarge.js'
figlet.parseFont('Cyberlarge', font)

export default function Ahoy() {
  const wordmark = figlet.textSync('KONG', { font: 'Cyberlarge' })
  return <div className="relative w-full flex items-start gap-0">
    <div className="z-10 w-full flex flex-col items-start gap-2">
      <div className="-mb-6 flex items-end gap-0 sm:gap-6">
        <div className="text-lg whitespace-pre [text-shadow:_0_0_4px_rgb(0_0_0_/_100%)] z-10">{wordmark}</div>
        <div className="w-[128px] h-[128px] ml-[-32px] sm:ml-0 z-0">
          <Image src={figureImage} alt="Kong" width={128} height={128} className="" />
        </div>
      </div>
      <p className="z-10 [text-shadow:_0_0_4px_rgb(0_0_0_/_100%)] text-sm">Real-time/historical EVM indexer x Analytics</p>
      <a href="https://github.com/murderteeth/kong" target="_blank" className="z-10 [text-shadow:_0_0_4px_rgb(0_0_0_/_100%)] text-xs">{'https://github.com/murderteeth/kong'}</a>
      <a href="/api/gql" target="_blank" className="z-10 [text-shadow:_0_0_4px_rgb(0_0_0_/_100%)] text-xs">{'https://kong.yearn.farm/api/gql'}</a>
    </div>
  </div>
}
