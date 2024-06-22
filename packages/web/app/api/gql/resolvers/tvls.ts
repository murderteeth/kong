import db from '@/app/api/db'
import { snakeToCamelCols } from '@/lib/strings'

const tvls = async (_: any, args: { 
  chainId: number,
  address?: `0x${string}`,
  period?: string,
  limit?: number,
  timestamp?: bigint
}) => {
  const { chainId, address, period, limit, timestamp } = args

  try {
    const result = await db.query(`
    SELECT 
      A.chain_id,
      A.address,
      A.value AS value,
      B.value AS price,
      B.component AS price_source,
      A.period,
      A.time
    FROM (
      SELECT 
        chain_id,
        address,
        AVG(value) AS value,
        CAST($3 AS text) AS period,
        MAX(block_number) AS block_number,
        time_bucket(CAST($3 AS interval), block_time) AS time
      FROM output
      WHERE chain_id = $1 
        AND (address = $2 OR $2 IS NULL) 
        AND label = 'tvl'
        AND component = 'tvl'
        AND (block_time > to_timestamp($4) OR $4 IS NULL)
      GROUP BY chain_id, address, time
      ORDER BY time ASC
      LIMIT $5
    ) A
    LEFT JOIN (
      SELECT 
        chain_id,
        address,
        AVG(value) AS value,
        MAX(component) AS component,
        CAST($3 AS text) AS period,
        MAX(block_number) AS block_number,
        time_bucket(CAST($3 AS interval), block_time) AS time
      FROM output
      WHERE chain_id = $1 
        AND (address = $2 OR $2 IS NULL) 
        AND label = 'price'
        AND (block_time > to_timestamp($4) OR $4 IS NULL)
      GROUP BY chain_id, address, time
      ORDER BY time ASC
      LIMIT $5
    ) B
    ON A.chain_id = B.chain_id
      AND A.address = B.address
      AND A.block_number = B.block_number
    `,
    [chainId, address, period ?? '1 day', timestamp, limit ?? 100])

    return snakeToCamelCols(result.rows)

  } catch (error) {
    console.error(error)
    throw new Error('!tvls')
  }
}

export default tvls
