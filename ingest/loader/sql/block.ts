import { Pool } from 'pg'

export async function upsert(pool: Pool, data: { 
  network_id: number, 
  block_number: number, 
  block_timestamp: number,
  queue_timestamp: number
}) {
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
    data.network_id, 
    data.block_number, 
    data.block_timestamp, 
    data.queue_timestamp
  ]

  await pool.query(query, values)
}
