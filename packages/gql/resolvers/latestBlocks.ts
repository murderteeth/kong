import db from '../db'

export default async (_: any, args: { chainId?: number }) => {
  const { chainId } = args
  const query = `
    SELECT 
      chain_id as "chainId", 
      block_number as "blockNumber", 
      FLOOR(EXTRACT(EPOCH FROM block_time)) * 1000 as "blockTime"
    FROM public.latest_block 
    WHERE chain_id = $1 OR $1 IS NULL
    ORDER BY chain_id
  `
  const values = [chainId]

  try {
    const res = await db.query(query, values)
    return res.rows
  } catch (error) {
    console.error(error)
    throw new Error('Failed to fetch latest block')
  }
}
