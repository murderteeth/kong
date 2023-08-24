import { Queue, Worker } from 'bullmq'

const bull = { connection: {
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT || 6379) as number,
}}

export const q = {
  block: {
    load: 'load-block'
  }, yearn: {
    index: 'index-yearn',
    indexJobs: {
      registry: 'registry',
      vault: 'vault'
    }, registry: {
      pointer: 'pointer-yearn-registry',
      pointerJobs: { catchup: 'catchup' },
      extract: 'extract-yearn-registry',
      extractJobs: { logs: 'logs', apetax: 'apetax' },
    }, vault: {
      pointer: 'pointer-yearn-vault',
      pointerJobs: { catchup: 'catchup' },
      extract: 'extract-yearn-vault',
      extractJobs: { logs: 'logs', state: 'state' },
      load: 'load-yearn-vault'
    }
  }
}

export function queue(name: string) {
  return new Queue(name, bull)
}

export function worker(name: string, handler: (job: any) => Promise<any>) {
  return new Worker(name, async job => {
      try {
        return await handler(job)
      } catch(error) {
        console.error('🤬', name, 'worker', error)
      }
    }, {
    ...bull,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 }
  })
}
