import { mq, types } from 'lib'
import db, { toUpsertSql } from '../db'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'

export default class Loader implements Processor {
  worker?: Worker

  handlers: Record<string, (data: any) => Promise<any>> = {
    [mq.job.load.block]: async data => 
    await upsert(data, 'latest_block', 'chain_id', 
      'WHERE latest_block.block_number < EXCLUDED.block_number'
    ),

    [mq.job.load.erc20]: async data => 
    await upsert(data, 'erc20', 'chain_id, address'),

    [mq.job.load.vault]: async data => 
    await upsert(data, 'vault', 'chain_id, address', 
      'WHERE vault.as_of_block_number < EXCLUDED.as_of_block_number'
    ),

    [mq.job.load.withdrawalQueue]: async data => 
    await upsertBatch(data.batch, 'withdrawal_queue', 'chain_id, vault_address, queue_index', 
      'WHERE withdrawal_queue.as_of_block_number < EXCLUDED.as_of_block_number'
    ),

    [mq.job.load.strategy]: async data => 
    await upsert(data, 'strategy', 'chain_id, address',
      'WHERE strategy.as_of_block_number < EXCLUDED.as_of_block_number'
    ),

    [mq.job.load.harvest]: async data => 
    await upsertBatch(data.batch, 'harvest', 'chain_id, block_number, block_index'),

    [mq.job.load.transfer]: async data => 
    await upsertBatch(data.batch, 'transfer', 'chain_id, block_number, block_index'),

    [mq.job.load.apr]: async (data: types.APR) => 
    await upsert(data, 'apr', 'chain_id, address, block_time'),

    [mq.job.load.tvl]: async (data: types.TVL) => 
    await upsert(data, 'tvl', 'chain_id, address, block_time')
  }

  async up() {
    this.worker = mq.worker(mq.q.load, async job => {
      const handler = this.handlers[job.name]
      if(handler) {
        console.log('📀', 'load', job.name)
        await handler(job.data)
      } else {
        console.warn('🚨', 'unknown job', job.name)
      }
    })
  }

  async down() {
    await this.worker?.close()
  }
}

async function upsert(data: any, table: string, pk: string, where?: string) {
  await db.query(
    toUpsertSql(table, pk, data, where),
    Object.values(data)
  )
}

async function upsertBatch(batch: any[], table: string, pk: string, where?: string) {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    for(const object of batch) {
      await client.query(
        toUpsertSql(table, pk, object, where),
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
