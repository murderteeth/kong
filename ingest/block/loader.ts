import { mq, types } from 'lib'
import db from '../db'
import { Worker } from 'bullmq'
import { Processor } from '../processor'

export class BlockLoader implements Processor {
  worker: Worker | undefined

  async up() {
    this.worker = mq.worker(mq.q.block.n, async job => {
      if(job.name !== mq.q.block.load) return
      const block = job.data as types.LatestBlock
      console.log('📀', mq.q.block.n, block.networkId, block.blockNumber)
      await upsert(block)
    })
  }

  async down() {
    await this.worker?.close()
  }
}

export async function upsert(block: types.LatestBlock) {
  const query = `
    INSERT INTO public.latest_block (network_id, block_number, block_timestamp, queue_timestamp, updated_at)
    VALUES ($1, $2, to_timestamp($3::double precision), to_timestamp($4::double precision), NOW())
    ON CONFLICT (network_id)
    DO UPDATE SET 
      block_number = EXCLUDED.block_number,
      block_timestamp = EXCLUDED.block_timestamp,
      queue_timestamp = EXCLUDED.queue_timestamp,
      updated_at = NOW()
    WHERE latest_block.block_number < EXCLUDED.block_number;
  `
  const values = [
    block.networkId, 
    block.blockNumber, 
    block.blockTimestamp, 
    block.queueTimestamp
  ]

  await db.query(query, values)
}