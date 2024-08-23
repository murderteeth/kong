'use client'

import { useData } from '@/hooks/useData'
import AsciiMeter from './AsciiMeter'
import prettyBytes from 'pretty-bytes'

export default function MessageQueueRedis() {
  const { monitor } = useData()
  return <div className="w-full flex flex-col">
    <div className="font-bold text-xl">Redis</div>
    <div className="w-full flex flex-col items-center justify-between gap-1">
      <div className="w-full flex items-center justify-between">
        <div className="text-yellow-700 whitespace-nowrap">memory</div>
        <AsciiMeter 
          current={monitor.redis.memory.used}
          max={monitor.redis.memory.total}
          label={`${prettyBytes(monitor.redis.memory.used)} / ${prettyBytes(monitor.redis.memory.total)}`} />
      </div>
      <div className="w-full flex items-center justify-between">
        <div className="text-yellow-700 whitespace-nowrap">clients</div>
        <AsciiMeter
          current={monitor.redis.clients}
          max={250}
          label={`${monitor.redis.clients} / 250`} />
      </div>
    </div>
  </div>
}