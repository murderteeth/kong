import db from '@/app/api/db'
import { snakeToCamelCols } from '@/lib/strings'

const timeseries = async (_: any, args: { 
  chainId: number,
  address: `0x${string}`,
  label: string,
  component: string,
  period?: string
}) => {
  const { chainId, address, label, component, period } = args
  try {

    const result = await db.query(`
    SELECT 
      CAST($1 AS int4) AS "chainId",
      CAST($2 AS text) AS address,
      CAST($3 AS text) AS label,
      CAST($4 AS text) AS component,
      AVG(value) as value,
      CAST($5 AS text) AS period,
      time_bucket(CAST($5 AS interval), block_time) AS time
    FROM output
    WHERE chain_id = $1 AND address = $2 AND label = $3 AND (component = $4 OR $4 IS NULL)
    GROUP BY time
    ORDER BY time ASC`,
    [chainId, address, label, component, period || '1 day'])

    return snakeToCamelCols(result.rows)

  } catch (error) {
    console.error(error)
    throw new Error('!outputs')
  }
}

export default timeseries
