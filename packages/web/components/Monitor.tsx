'use client'

import React from 'react'
import Panel from './Panel'
import Frosty from './Frosty'
import Connector from './Connector'
import { useData } from '@/hooks/useData'

export default function Monitor() {
  const { monitor } = useData()

  function padNumber(value: number) {
    return value.toString().padStart(3, '0')
  }

  return <Panel className={'w-full flex flex-col items-start'}>
    <div className="font-bold text-lg">Queue activity</div>
    {monitor.queues.map((queue, index) => <div key={queue.name} className={`
      w-full flex items-center justify-between gap-2 text-xs`}>
      <div className="whitespace-nowrap">{queue.name}</div>
      <Connector name={queue.name} index={index} padding={{ default: 0, sm: 32 }} />
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Frosty _key={`${queue.name}-w-${queue.waiting}`}>{`w ${padNumber(queue.waiting)}`}</Frosty>
        <Frosty _key={`${queue.name}-a-${queue.active}`}>{`a ${padNumber(queue.active)}`}</Frosty>
        <Frosty _key={`${queue.name}-f-${queue.failed}`}>{`f ${padNumber(queue.failed)}`}</Frosty>
      </div>
    </div>)}

    <div className="font-bold text-lg mt-4">Redis</div>
    <div className="w-full flex flex-col items-center justify-between text-xs">
      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">clients</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`clients-${monitor.redis.clients}`}>{monitor.redis.clients}</Frosty>
        </div>
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">memory (t)</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`memory-total-${monitor.redis.memory.total}`}>{monitor.redis.memory.total}</Frosty>
        </div>
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">memory (u)</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`memory-used-${monitor.redis.memory.used}`}>{monitor.redis.memory.used}</Frosty>
        </div>
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">memory (p)</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`memory-peak-${monitor.redis.memory.peak}`}>{monitor.redis.memory.peak}</Frosty>
        </div>
      </div>
    </div>

    <div className="font-bold text-lg mt-4">Postgres</div>
    <div className="w-full flex flex-col items-center justify-between text-xs">
    <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">clients</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`db-clients-${monitor.db.clients}`}>{monitor.db.clients}</Frosty>
        </div>
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">disk</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`db-size-${monitor.db.databaseSize}`}>{monitor.db.databaseSize}</Frosty>
        </div>
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">index h/r</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`db-indexhr-${monitor.db.indexHitRate}`}>{monitor.db.indexHitRate}</Frosty>
        </div>
      </div>

      <div className="w-full flex items-center justify-between">
        <div className="whitespace-nowrap">cache h/r</div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Frosty _key={`db-cachehr-${monitor.db.cacheHitRate}`}>{monitor.db.cacheHitRate}</Frosty>
        </div>
      </div>
    </div>
  </Panel>
}
