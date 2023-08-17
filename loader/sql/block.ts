import { LatestBlock } from 'lib'
import { Pool } from 'pg'

export async function upsert(pool: Pool, data: LatestBlock) {
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
    data.networkId, 
    data.blockNumber, 
    data.blockTimestamp, 
    data.queueTimestamp
  ]

  await pool.query(query, values)
}
