'use client'

import { useData } from '@/hooks/useData'
import AsciiMeter from './AsciiMeter'
import prettyBytes from 'pretty-bytes'
import Frosty from './Frosty'
import { fPercent } from '@/lib/format'

export default function Postgres() {
  const { monitor } = useData()
  return <div className="w-full flex flex-col">
    <div className="font-bold text-xl">Postgres</div>
    <div className="w-full flex flex-col items-center justify-between gap-1">
      <div className="w-full flex items-center justify-between">
        <div className="text-yellow-700 whitespace-nowrap">clients</div>
        <AsciiMeter
          current={monitor.db.clients}
          max={100}
          label={`${monitor.db.clients} / 100`} />
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="text-yellow-700  whitespace-nowrap">disk</div>
        <AsciiMeter
          current={monitor.db.databaseSize}
          max={16 * 1024 * 1024 * 1024}
          label={`${prettyBytes(Number(monitor.db.databaseSize))} / ${prettyBytes(16 * 1024 * 1024 * 1024)}`} />
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="text-yellow-700  whitespace-nowrap">index h/r</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`db-indexhr-${monitor.db.indexHitRate}`}>{fPercent(monitor.db.indexHitRate)}</Frosty>
        </div>
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="text-yellow-700  whitespace-nowrap">cache h/r</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`db-cachehr-${monitor.db.cacheHitRate}`}>{fPercent(monitor.db.cacheHitRate)}</Frosty>
        </div>
      </div>
    </div>
  </div>
}
