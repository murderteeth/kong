import db from '../../db'
import { PERIOD } from '../typeDefs/period'

const apys = async (_: any, args: { chainId: number, address: string, period?: string, limit?: number }) => {
  const { chainId, address, period, limit } = args
  try {
    const result = await db.query(`

WITH sample AS (
  SELECT
    CAST($1 AS int4) AS "chainId",
    CAST($2 AS text) AS address,
    CAST($3 AS text) AS period,
    time_bucket(CAST($3 AS interval), block_time) AS time,
    AVG(value) AS average
  FROM
    output
  WHERE
    chain_id = $1 
    AND address = $2
    AND label = 'apy-bwd-delta-pps'
    AND component = 'net'
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
        Math.min(limit || 90, 90)
      ]
    )

    return result.rows
  } catch (error) {
    console.error(error)
    throw new Error('!apys')
  }
}

export default apys
