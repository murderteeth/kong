import { mq } from 'lib'
import db, { toUpsertSql } from '../db'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import sparkline from './sparkline'

export default class Loader implements Processor {
  worker?: Worker
  queue?: Queue

  handlers: Record<string, (data: any, queue?: Queue) => Promise<any>> = {
    [mq.job.load.erc20]: data => upsert(data, 'erc20', 'chain_id, address'),
    [mq.job.load.harvest]: data => upsertBatch(data.batch, 'harvest', 'chain_id, block_number, block_index'),
    [mq.job.load.transfer]: data => upsertBatch(data.batch, 'transfer', 'chain_id, block_number, block_index'),
    [mq.job.load.apr]: data => upsert(data, 'apr', 'chain_id, address, block_timestamp'),
    [mq.job.load.tvl]: data => Promise.all([
      upsert(data, 'tvl', 'chain_id, address, block_time'),
      this.queue?.add(mq.job.load.sparkline.tvl, { chainId: data.chainId, address: data.address })
    ]),
    [mq.job.load.sparkline.tvl]: data => sparkline.tvl(data),
  }

  async up() {
    this.queue = mq.queue(mq.q.load)
    this.worker = mq.worker(mq.q.load, async job => {
      const handler = this.handlers[job.name]
      if(handler) {
        console.log('📀', 'load', job.name)
        await handler(job.data, this.queue)
      } else {
        console.warn('🚨', 'unknown job', job.name)
      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.queue?.close()
  }
}

async function upsert(data: any, table: string, pk: string) {
  await db.query(
    toUpsertSql(table, pk, data),
    Object.values(data)
  )
}

async function upsertBatch(batch: any[], table: string, pk: string) {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    for(const object of batch) {
      await client.query(
        toUpsertSql(table, pk, object),
        Object.values(object)
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
