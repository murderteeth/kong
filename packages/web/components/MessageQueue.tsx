'use client'

import { useData } from '@/hooks/useData'
import { useMemo } from 'react'
import AsciiMeter from './AsciiMeter'
import { fPercent } from '@/lib/format'

function formatNumber(value: number) {
  if (value < 1000) return String(value).padStart(3, '0')
  if (value < 1e6) return String(Math.floor(value / 1e3)).padStart(3, '0') + 'K'
  if (value < 1e9) return String(Math.floor(value / 1e6)).padStart(3, '0') + 'M'
  return String(Math.floor(value / 1e9)).padStart(3, '0') + 'B'
}

export default function MessageQueue() {
  const { monitor } = useData()

  const fails = useMemo(() => {
    const max = 100 * monitor.queues.length
    const current = monitor.queues.flatMap(queue => queue.failed).length
    return { max, current }
  }, [monitor.queues])

  return <div className={'w-full flex flex-col gap-2'}>
    <div className="font-bold text-xl">Message Queue</div>
    <div className="flex flex-col gap-4">
      {monitor.queues.map((queue, index) => <AsciiMeter
        key={queue.name}
        current={queue.active}
        current2={queue.waiting}
        max={(queue.name.includes('-')) ? 50 : 100}
        leftLabel={queue.name}
        rightLabel={`w ${formatNumber(queue.waiting)}, a ${formatNumber(queue.active)}`} />)}
      <AsciiMeter
        current={fails.current}
        max={fails.max}
        leftLabel='critical fail'
        rightLabel={fPercent(Math.floor(fails.current / fails.max))} />
    </div>
  </div>
}
