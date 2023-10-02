import db from '../db'

export default async (_: any, args: { chainId: number, address: string }) => {
  const { chainId, address } = args
  try {
    const result = await db.query(`

SELECT
  CAST($1 AS int4) AS chain_id,
  CAST($2 AS text) AS address,
  '1d' AS period,
  time_bucket('1 day', block_time) AS time,
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
  time ASC
LIMIT 30;

    `, [chainId, address])

    return result.rows
  } catch (error) {
    console.error(error)
    throw new Error('Failed to fetch tvls')
  }
}
