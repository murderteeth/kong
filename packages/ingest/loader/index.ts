import { mq, types } from 'lib'
import db, { toUpsertSql } from '../db'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import sparkline from './sparkline'

export default class Loader implements Processor {
  worker?: Worker
  queue?: Queue

  handlers: Record<string, (data: any, queue?: Queue) => Promise<any>> = {
    [mq.job.load.block]: async data => {
      await db.query(
        `${toUpsertSql(
          'latest_block', 'chain_id', data, 
          'WHERE latest_block.block_number < EXCLUDED.block_number')}`,
        Object.values(data)
      )
    },

    [mq.job.load.erc20]: async data => await upsert(data, 'erc20', 'chain_id, address'),
    [mq.job.load.vault]: async data => await upsert(data, 'vault', 'chain_id, address'),
    [mq.job.load.strategy]: async data => await upsert(data, 'strategy', 'chain_id, address'),
    [mq.job.load.harvest]: async data => await upsertBatch(data.batch, 'harvest', 'chain_id, block_number, block_index'),
    [mq.job.load.transfer]: async data => await upsertBatch(data.batch, 'transfer', 'chain_id, block_number, block_index'),

    [mq.job.load.apr]: async (data: types.APR) => await Promise.all([
      upsert(data, 'apr', 'chain_id, address, block_timestamp'),
      this.queue?.add(mq.job.load.strategy, { 
        chainId: data.chainId, 
        address: data.address, 
        grossApr: data.gross, 
        netApr: data.net,
        asOfBlockNumber: data.blockNumber
      }),
      this.queue?.add(mq.job.load.sparkline.apr, { chainId: data.chainId, address: data.address })
    ]),

    [mq.job.load.tvl]: async (data: types.TVL) => await Promise.all([
      upsert(data, 'tvl', 'chain_id, address, block_time'),
      this.queue?.add(mq.job.load.vault, { 
        chainId: data.chainId, 
        address: data.address, 
        tvlUsd: data.tvlUsd,
        asOfBlockNumber: data.blockNumber
      }),
      this.queue?.add(mq.job.load.sparkline.tvl, { chainId: data.chainId, address: data.address })
    ]),

    [mq.job.load.sparkline.apr]: async data => await sparkline.apr(data),
    [mq.job.load.sparkline.tvl]: async data => await sparkline.tvl(data),
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
