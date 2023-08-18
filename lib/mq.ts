import { Queue, Worker } from 'bullmq'

const bull = { connection: {
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT || 6379) as number,
}}

export const n = {
  extract: {
    registry: 'extract-registry',
    vault: 'extract-vault'
  }, load: {
    block: 'load-block',
    vault: 'load-vault'
  }
}

export function queue(name: string) {
  return new Queue(name, bull)
}

export function worker(name: string, handler: (job: any) => Promise<any>) {
  return new Worker(name, handler, bull)
}
