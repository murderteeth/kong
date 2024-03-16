import { Queue, Worker } from 'bullmq'
import { Job } from './types'

export const q = {
  fanout: 'fanout',
  extract: 'extract',
  load: 'load',
  probe: 'probe'
}

export const job: { [queue: string]: { [job: string]: Job } } = {
  fanout: {
    contracts: { queue: 'fanout', name: 'contracts' },
    events: { queue: 'fanout', name: 'events' },
    timeseries: { queue: 'fanout', name: 'timeseries' }
  },

  extract: {
    block: { queue: 'extract', name: 'block' },
    evmlog: { queue: 'extract', name: 'evmlog' },
    snapshot: { queue: 'extract', name: 'snapshot' },
    timeseries: { queue: 'extract', name: 'timeseries' },
    meta: { queue: 'extract', name: 'meta' },
    waveydb: { queue: 'extract', name: 'waveydb' },
    apetax: { queue: 'extract', name: 'apetax' },
  },

  load: {
    block: { queue: 'load', name: 'block' },
    output: { queue: 'load', name: 'output' },
    monitor: { queue: 'load', name: 'monitor' },
    evmlog: { queue: 'load', name: 'evmlog' },
    snapshot: { queue: 'load', name: 'snapshot' },
    thing: { queue: 'load', name: 'thing' },
    price: { queue: 'load', name: 'price' }
  },

  probe: {
    all: { queue: 'probe', name: 'all' }
  }
}

// -= job priority in bullmq =-
// https://github.com/taskforcesh/bullmq/blob/a01bb0b0345509cde6c74843323de6b67729f310/docs/gitbook/guide/jobs/prioritized.md
// no priority set = highest (default)
// 1 = next highest
// 2 ** 21 = lowest
// adding prioritized jobs to a queue goes like O(log(n))
// where n is the number of prioritized jobs in the queue
// (ie, total jobs - non-prioritized jobs)
export const LOWEST_PRIORITY = 2 ** 21

const bull = { connection: {
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT || 6379) as number,
}}

const queues: { [key: string]: Queue } = {}

export function connect(queueName: string) {
  return new Queue(queueName, bull)
}

export async function add(job: Job, data: any, options?: any) {
  if (!queues[job.queue]) {
    queues[job.queue] = connect(job.queue)
  }
  await queues[job.queue].add(job.name, data, options)
}

export function worker(queueName: string, handler: (job: any) => Promise<any>) {
  let concurrency = 1
  const queue = new Queue(queueName, bull)
  const worker = new Worker(queueName, async job => {
    try {
      await handler(job)
    } catch(error) {
      console.error('🤬', error)
      throw error
    }
  }, {
    ...bull,
    concurrency,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 }
  })

  const timer = setInterval(async () => {
    const jobs = await queue.count()
    const targetConcurrency = computeConcurrency(jobs, {
      min: 1, max: (process.env.MQ_CONCURRENCY_MAX_PER_PROCESSOR || 50) as number,
      threshold: (process.env.MQ_CONCURRENCY_THRESHOLD || 200) as number
    })

    if(targetConcurrency > concurrency) {
      console.log('🚀', 'concurrency up', queueName, targetConcurrency)
      concurrency = targetConcurrency
      worker.concurrency = targetConcurrency

    } else if(targetConcurrency < concurrency) {
      console.log('🐌', 'concurrency down', queueName, targetConcurrency)
      concurrency = targetConcurrency
      worker.concurrency = targetConcurrency

    }
  }, 5000)

  const _close = worker.close.bind(worker)
  worker.close = async () => {
    clearInterval(timer)
    await queue.close()
    await _close()
  }

  return worker
}

export interface ConcurrencyOptions {
  min: number
  max: number
  threshold: number
}

export function computeConcurrency(jobs: number, options: ConcurrencyOptions) {
  const m = (options.max - options.min) / (options.threshold - 0)
  const concurrency = Math.floor(m * jobs + options.min)
  return Math.min(Math.max(concurrency, options.min), options.max)
}

async function down() {
  await Promise.all(Object.values(queues).map(queue => queue.close()))
}

process.on('SIGINT', down)
process.on('SIGTERM', down)
