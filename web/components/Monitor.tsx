'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Panel from './Panel'
import Frosty from './Frosty'

interface MonitorResults {
  queues: {
    name: string
    waiting: number
    active: number
    failed: number
  }[]
  redis: {
    uptime: number
    clients: number
    memory: {
      total: number
      used: number
      peak: number
    }
  }
}

const GRAPHQL_QUERY = `query Monitor {
  monitor {
    queues {
      name
      waiting
      active
      failed
    }
    redis {
      uptime
      clients
      memory {
        total
        used
        peak
      }
    }
  }
}`

async function fetchMonitorResults() {
  const response = await fetch(process.env.GQL || 'http://localhost:3001/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: GRAPHQL_QUERY })
  })

  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

  return (await response.json()).data.monitor
}

function useMonitorResults() {
  const frequency = 1000
  const [results, setResults] = useState<MonitorResults>({
    queues: [],
    redis: {
      uptime: 0,
      clients: 0,
      memory: {
        total: 0,
        used: 0,
        peak: 0
      }
    }
  })

  useEffect(() => {
    const timer = setInterval(() => {
      fetchMonitorResults().then(data => setResults(data))
    }, frequency)
    return () => clearInterval(timer)
  }, [])

  return results
}

export default function Monitor() {
  const results = useMonitorResults()

  function pad(value: number) {
    return value.toString().padStart(3, '0')
  }

  return <Panel className={'w-full flex flex-col items-start'}>
    <div className="font-bold text-lg">Queue activity</div>
    {results.queues.map((queue, index) => <div key={queue.name} className={`
      w-full flex items-center justify-between gap-2 text-xs
      ${index % 2 === 1 ? '' : 'bg-zinc-900/20'}`}>
      <div>{queue.name}</div>
      <div className="flex items-center gap-2">
        <Frosty _key={`${queue.name}-w-${queue.waiting}`}>{`w ${pad(queue.waiting)}`}</Frosty>
        <Frosty _key={`${queue.name}-a-${queue.active}`}>{`a ${pad(queue.active)}`}</Frosty>
        <Frosty _key={`${queue.name}-f-${queue.failed}`}>{`f ${pad(queue.failed)}`}</Frosty>
      </div>
    </div>)}
  </Panel>
}
