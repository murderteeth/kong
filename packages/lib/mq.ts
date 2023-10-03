import { Queue, QueueOptions, Worker } from 'bullmq'

const bull = { connection: {
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT || 6379) as number,
}}

export const q = {
  fanout: 'fanout',
  compute: 'compute',
  load: 'load', 

  transfer: {
    extract: 'transfer-extract'
  },

  block: {
    poll: 'block-poll',
    load: 'block-load'
  },

  yearn: {
    index: 'yearn-index',
    indexJobs: { registry: 'registry', vault: 'vault' }, 

    registry: {
      pointer: 'yearn-registry-pointer',
      pointerJobs: { catchup: {
        block: 'block-catchup'
      } },
      extract: 'yearn-registry-extract',
      extractJobs: { logs: 'logs', apetax: 'apetax' },
    }, 

    vault: {
      pointer: 'yearn-vault-pointer',
      pointerJobs: { catchup: {
        block: 'catchup-block',
        tvl: 'catchup-tvl',
      } },
      extract: 'yearn-vault-extract',
      extractJobs: {
        logs: 'logs',
        state: 'state',
        harvest: 'harvest',
        tvl: 'tvl'
      },
      load: 'yearn-vault-load',
      loadJobs: { vault: 'vault', withdrawalQueue: 'withdrawal-queue' }
    }, 

    strategy: {
      pointer: 'yearn-strategy-pointer',
      pointerJobs: { catchup: {
        block: 'catchup-block'
      } },
      extract: 'yearn-strategy-extract',
      extractJobs: { logs: 'logs', state: 'state' },
      load: 'yearn-strategy-load',
      loadJobs: { strategy: 'strategy' }
    }
  }
}

export const job = {
  __noname: '',

  fanout: {
    harvestApr: 'harvest-apr'
  },

  compute: {
    harvestApr: 'harvest-apr'
  },

  load: {
    erc20: 'erc20',
    transfer: 'transfer',
    vault: 'vault',
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
