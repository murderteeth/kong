import { Queue, QueueOptions, Worker } from 'bullmq'

export const q = {
  fanout: 'fanout',
  extract: 'extract',
  compute: 'compute',
  load: 'load'
}

export const job = {
  fanout: {
    registry: 'registry',
    vault: 'vault',
    strategy: 'strategy',
    tvl: 'tvl',
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
  },

  compute: {
    tvl: 'tvl',
    harvestApr: 'harvest-apr'
  },

  load: {
    block: 'block',
    erc20: 'erc20',
    transfer: 'transfer',
    vault: 'vault',
    withdrawalQueue: 'withdrawal-queue',
    strategy: 'strategy',
    harvest: 'harvest',
    apr: 'apr',
    tvl: 'tvl',
    sparkline: {
      apr: 'sparkline-apr',
      tvl: 'sparkline-tvl'
    }
  }
}

// https://github.com/taskforcesh/bullmq/blob/a01bb0b0345509cde6c74843323de6b67729f310/docs/gitbook/guide/jobs/prioritized.md
// -= job priority in bullmq =-
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
    const targetConcurrency = computeConcurrency(jobs)

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

export function computeConcurrency(jobs: number) {
  const minConcurrency = 1
  const maxConcurrency = 400
  const upperJobLimit = 2000
  const scalingFactor = 10

  let concurrency = jobs > upperJobLimit
  ? maxConcurrency
  : Math.ceil(jobs / scalingFactor)

  return Math.min(Math.max(concurrency, minConcurrency), maxConcurrency)
}
