import { Queue, Worker } from 'bullmq'

const bull = { connection: {
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT || 6379) as number,
}}

export const q = {
  block: {
    load: 'load-block'
  }, archive: {
    pointer: 'archive-pointer',
    pointerJobs: { catchup: 'catchup' }
  }, yearn: {
    index: 'yearn-index',
    indexJobs: {
      registry: 'registry'
    }, registry: {
      extract: 'extract-yearn-registry',
      extractJobs: { logs: 'logs' },
    }, vault: {
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
