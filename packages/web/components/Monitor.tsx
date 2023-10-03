'use client'

import React from 'react'
import Panel from './Panel'
import Frosty from './Frosty'
import { useData } from '@/hooks/useData'
import AsciiMeter from './AsciiMeter'
import prettyBytes from 'pretty-bytes'
import { fPercent } from '@/util/format'

export default function Monitor() {
  const { monitor } = useData()

  function formatNumber(value: number) {
    if (value < 1000) return String(value).padStart(3, '0') + '&nbsp;'
    if (value < 1e6) return String(Math.floor(value / 1e3)).padStart(3, '0') + 'K'
    if (value < 1e9) return String(Math.floor(value / 1e6)).padStart(3, '0') + 'M'
    return String(Math.floor(value / 1e9)).padStart(3, '0') + 'B'
  }

  return <Panel className={'w-full flex flex-col items-start'}>
    <div className="font-bold text-lg">Message Queue</div>
    {monitor.queues.map((queue, index) => <div key={queue.name} className={`
      w-full flex items-center justify-between gap-2 text-xs`}>
      <div className="whitespace-nowrap">{queue.name}</div>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Frosty _key={`${queue.name}-w-${formatNumber(queue.waiting)}`} disabled={queue.waiting < 1}>
          <span dangerouslySetInnerHTML={{ __html: `w ${formatNumber(queue.waiting)}` }} />
        </Frosty>
        <Frosty _key={`${queue.name}-a-${formatNumber(queue.active)}`} disabled={queue.active < 1}>
          <span dangerouslySetInnerHTML={{ __html: `a ${formatNumber(queue.active)}` }} />
        </Frosty>
        <Frosty _key={`${queue.name}-f-${formatNumber(queue.failed)}`} disabled={queue.failed < 1}>
          <span dangerouslySetInnerHTML={{ __html: `f ${formatNumber(queue.failed)}` }} />
        </Frosty>
      </div>
    </div>)}

    <div className="font-bold text-lg mt-4">Redis</div>
    <div className="w-full flex flex-col items-center justify-between text-xs gap-1">
      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">memory</div>
        <AsciiMeter 
          current={monitor.redis.memory.used}
          max={monitor.redis.memory.total}
          label={`${prettyBytes(monitor.redis.memory.used)} / ${prettyBytes(monitor.redis.memory.total)}`} />
      </div>
      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">clients</div>
        <AsciiMeter
          current={monitor.redis.clients}
          max={250}
          label={`${monitor.redis.clients} / 250`} />
      </div>
    </div>

    <div className="font-bold text-lg mt-4">Postgres</div>

    <div className="w-full flex flex-col items-center justify-between text-xs gap-1">
      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">clients</div>
        <AsciiMeter
          current={monitor.db.clients}
          max={100}
          label={`${monitor.db.clients} / 100`} />
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">disk</div>
        <AsciiMeter
          current={monitor.db.databaseSize}
          max={1 * 1024 * 1024 * 1024}
          label={`${prettyBytes(Number(monitor.db.databaseSize))} / ${prettyBytes(1 * 1024 * 1024 * 1024)}`} />
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">index h/r</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`db-indexhr-${monitor.db.indexHitRate}`}>{fPercent(monitor.db.indexHitRate)}</Frosty>
        </div>
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">cache h/r</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`db-cachehr-${monitor.db.cacheHitRate}`}>{fPercent(monitor.db.cacheHitRate)}</Frosty>
        </div>
      </div>
    </div>
  </Panel>
}
