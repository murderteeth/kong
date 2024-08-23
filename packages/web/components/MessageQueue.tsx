'use client'

import { useData } from '@/hooks/useData'
import Frosty from './Frosty'

function formatNumber(value: number) {
  if (value < 1000) return String(value).padStart(3, '0') + '&nbsp;'
  if (value < 1e6) return String(Math.floor(value / 1e3)).padStart(3, '0') + 'K'
  if (value < 1e9) return String(Math.floor(value / 1e6)).padStart(3, '0') + 'M'
  return String(Math.floor(value / 1e9)).padStart(3, '0') + 'B'
}

export default function MessageQueue() {
  const { monitor } = useData()

  return <div className={'w-full flex flex-col items-start'}>
  <div className="font-bold text-xl">Message Queue</div>
  {monitor.queues.map((queue, index) => <div key={queue.name} className={`
    w-full flex items-center justify-between gap-2`}>
    <div className="text-lg text-yellow-700 whitespace-nowrap">{queue.name}</div>
    <div className="flex items-center gap-2 text-lg whitespace-nowrap">
      <Frosty _key={`${queue.name}-w-${formatNumber(queue.waiting)}`} disabled={queue.waiting < 1}>
        <span dangerouslySetInnerHTML={{ __html: `w ${formatNumber(queue.waiting)}` }} />
      </Frosty>
      <Frosty _key={`${queue.name}-a-${formatNumber(queue.active)}`} disabled={queue.active < 1}>
        <span dangerouslySetInnerHTML={{ __html: `a ${formatNumber(queue.active)}` }} />
      </Frosty>
      <Frosty _key={`${queue.name}-f-${formatNumber(queue.failed)}`} disabled={queue.failed < 1}>
        <span dangerouslySetInnerHTML={{ __html: `e ${formatNumber(queue.failed)}` }} />
      </Frosty>
    </div>
  </div>)}
  </div>
}
