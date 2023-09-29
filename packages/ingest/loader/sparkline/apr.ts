import db from '../../db'

export default async (data: { chainId: number, address: `0x${string}` }) => {
  const { chainId, address } = data
  const query = `
WITH new_records AS (
  SELECT
    CAST($1 AS int4) AS chain_id,
    CAST($2 AS text) AS address,
    'strategy-apr-7d' as type,
    time_bucket('7 day', block_timestamp) AS time,
    LAST(net, block_timestamp) AS value
  FROM
    apr
  WHERE
    chain_id = $1 AND address = $2
  GROUP BY
    time
  ORDER BY
    time DESC
  LIMIT 3
), 
to_delete AS (
  DELETE FROM sparkline
  WHERE (chain_id, address, type) IN (SELECT chain_id, address, type FROM new_records)
  RETURNING *
)
INSERT INTO sparkline (chain_id, address, type, value, time)
SELECT chain_id, address, type, value, time FROM new_records
ON CONFLICT (chain_id, address, type, time) 
DO UPDATE SET value = EXCLUDED.value;`

  await db.query(query, [chainId, address])
}
