import { Queue, QueueOptions, Worker } from 'bullmq'

export const q = {
  fanout: 'fanout',
  extract: 'extract',
  compute: 'compute',
  load: 'load',
  probe: 'probe',
  monitor: 'monitor'
}

export const job = {
  fanout: {
    registry: 'registry',
    vault: 'vault',
    strategy: 'strategy',
    tvl: 'tvl',
    apy: 'apy',
    harvestApr: 'harvest-apr'
  },

  extract: {
    block: 'block',
    evmlogs: 'evmlogs',
    apetax: 'apetax',
    vault: 'vault',
    strategy: 'strategy',
    harvest: 'harvest',
    transfer: 'transfer',
    risk: 'risk',
    meta: 'meta'
  },

  compute: {
    tvl: 'tvl',
    apy: 'apy',
    harvestApr: 'harvest-apr'
  },

  load: {
    block: 'block',
    erc20: 'erc20',
    transfer: 'transfer',
    vault: 'vault',
    withdrawalQueue: 'withdrawal-queue',
    strategy: 'strategy',
    strategyLenderStatus: 'strategy-lender-status',
    harvest: 'harvest',
    riskGroup: 'risk',
    tvl: 'tvl',
    apy: 'apy',
    apr: 'apr',
    sparkline: {
      tvl: 'sparkline-tvl',
      apy: 'sparkline-apy',
      apr: 'sparkline-apr'
    }
  },

  probe: {
    ingest: 'ingest'
  },

  monitor: {
    ingest: 'ingest'
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

export function queue(name: string, options?: QueueOptions) {
  return new Queue(name, {...bull, ...options})
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
      min: 1, max: 50,
      threshold: 200  
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
