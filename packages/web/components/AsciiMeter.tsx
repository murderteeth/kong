import React, { useMemo } from 'react'

export default function AsciiMeter(
  { current, max, label } 
  : { current: number, max: number, label?: string }
) {
  const scale = 24

  const currentScaled = useMemo(() => {
    const scaled = Math.floor((current / max) * scale)
    const trimmed = Math.max(0, Math.min(scale, scaled))
    const nummed = Number.isFinite(trimmed) ? trimmed: 0
    return nummed
  }, [current, max])

  return <div className={'relative flex items-center'}>
    <span className={'absolute right-1 text-xs text-yellow-800'}>{label}</span>
    <span className={'text-[10px] text-yellow-300'}>
      {Array(currentScaled).fill('▒').join('')}
    </span>
    <span className={'text-[10px] text-yellow-800'}>
      {Array(scale - currentScaled).fill('░').join('')}
    </span>
  </div>
}
