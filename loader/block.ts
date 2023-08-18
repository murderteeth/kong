import { mq, types } from 'lib'
import pool from './pool'
import { Worker } from 'bullmq'

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

  await pool.query(query, values)
}

export class BlockLoader implements types.Processor {
  worker: Worker | undefined

  async up() {
    this.worker = mq.worker(mq.n.load.block, async job => {
      const block = job.data as types.LatestBlock
      try {
        console.log('📀', mq.n.load.block, block.networkId, block.blockNumber)
        await upsert(block)
        return true
      } catch(error) {
        console.error('🤬', mq.n.load.block, block, error)
        return false
      }
    })
  }

  async down() {
    await this.worker?.close()
  }
}
