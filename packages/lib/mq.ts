import { Queue, QueueOptions, Worker } from 'bullmq'

const bull = { connection: {
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT || 6379) as number,
}}

export const job = {
  compute: {
    harvestApr: 'harvest-apr'
  },

  load: {
    erc20: 'erc20',
    transfer: 'transfer',
    harvest: 'harvest',
    apr: 'apr'
  }
}

export const q = {
  __noJobName: '',

  load: {
    name: 'load',
    jobs: { 
      erc20: 'erc20',
      transfer: 'transfer',
      harvest: 'harvest',
      apr: 'apr'
    }
  },

  compute: 'compute',

  transfer: {
    extract: 'transfer-extract'
  },

  block: {
    poll: 'block-poll',
    load: 'block-load'
  },

  price: {
    poll: 'price-poll',
    load: 'price-load'
  },

  tvl: {
    load: 'tvl-load'
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

export function queue(name: string, options?: QueueOptions) {
  return new Queue(name, {...bull, ...options})
}

export function worker(name: string, handler: (job: any) => Promise<any>, concurrency = 1) {
  return new Worker(name, async job => {
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
}
