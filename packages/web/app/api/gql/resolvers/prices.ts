import db from '@/app/api/db'
import { snakeToCamelCols } from '@/lib/strings'

const prices = async (_: any, args: { chainId?: number, address?: `0x${string}`, timestamp?: bigint }) => {
  const { chainId, address, timestamp } = args
  try {

    const result = await db.query(`
    SELECT 
      chain_id as "chainId",
      address,
      price_usd as "priceUsd",
      price_source as "priceSource",
      block_number as "blockNumber",
      block_time as timestamp
    FROM price
    WHERE (chain_id = $1 OR $1 IS NULL)
      AND (address = $2 OR $2 IS NULL)
      AND (block_time > $3 OR $3 IS NULL)
    ORDER BY block_time ASC`,
    [chainId, address, timestamp])

    return result.rows

  } catch (error) {
    console.error(error)
    throw new Error('!prices')
  }
}

export default prices
