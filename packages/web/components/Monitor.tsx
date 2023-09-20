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
      <Connector name={queue.name} index={index} padding={{ default: 0, sm: 59 }} />
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Frosty _key={`${queue.name}-w-${queue.waiting}`}>{`w ${padNumber(queue.waiting)}`}</Frosty>
        <Frosty _key={`${queue.name}-a-${queue.active}`}>{`a ${padNumber(queue.active)}`}</Frosty>
        <Frosty _key={`${queue.name}-f-${queue.failed}`}>{`f ${padNumber(queue.failed)}`}</Frosty>
      </div>
    </div>)}
  </Panel>
}
