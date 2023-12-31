import db from '../../db'
import { PERIOD } from '../typeDefs/period'

export default async (_: any, args: { chainId: number, address: string, period?: string, limit?: number }) => {
  const { chainId, address, period, limit } = args
  try {
    const result = await db.query(`

WITH sample as (
  SELECT
    CAST($1 AS int4) AS "chainId",
    CAST($2 AS text) AS address,
    CAST($3 AS text) AS period,
    time_bucket(CAST($3 AS interval), block_time) AS time,
    FIRST(tvl_usd, block_time) AS open,
    MAX(tvl_usd) AS high,
    MIN(tvl_usd) AS low,
    LAST(tvl_usd, block_time) AS close
  FROM
    tvl
  WHERE
    chain_id = $1 AND address = $2
  GROUP BY
    time
  ORDER BY
    time DESC
  LIMIT $4
)
SELECT * from sample ORDER BY time ASC;

    `, [
      chainId, 
      address, 
      PERIOD[(period || 'ONE_DAY')], 
      Math.min(limit || 30, 30)
    ]
  )

    return result.rows
  } catch (error) {
    console.error(error)
    throw new Error('!tvls')
  }
}
