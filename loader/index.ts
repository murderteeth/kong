import { Worker } from 'bullmq'
import { Pool } from 'pg'
import dotenv from 'dotenv'
import { upsert } from './sql/block';
import { LatestBlock } from 'lib'
dotenv.config()

;(BigInt as any).prototype["toJSON"] = function () {
  return this.toString()
}

const bull = { connection: {
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT || 6379) as number,
}}

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: (process.env.POSTGRES_PORT || 5432) as number,
  database: process.env.POSTGRES_DATABASE || 'user',
  user: process.env.POSTGRES_USER || 'user',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 10,
  idleTimeoutMillis: 30_000,
})

const blockWorker = new Worker('block', async job => {
  const block = job.data as LatestBlock
  try {
    await upsert(pool, block)
    console.log('📀 block', block.networkId, block.blockNumber)
    return true
  } catch(error) {
    console.error('🤬 block', block, error)
    return false
  }
}, bull)

console.log('🦍 loader up')

function shutdown() {
  blockWorker.close().then(() => {
    pool.end().then(() => {
      console.log('🦍 loader down')
      process.exit(0)
    })
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
