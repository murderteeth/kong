import db from '../db'

export default async (_: any, args: { chainId: number, address: string }) => {
  const { chainId, address } = args
  try {
    const result = await db.query(`

SELECT
  chain_id AS "chainId",
  address,
  sender,
  receiver,
  amount AS amount,
  amount_usd AS "amountUsd",
  block_number AS "blockNumber",
  block_index AS "blockIndex",
  block_timestamp AS "blockTimestamp",
  transaction_hash AS "transactionHash"
FROM
  transfer
WHERE
  (chain_id = $1 OR $1 IS NULL) AND (address = $2 OR $2 IS NULL)
  AND amount_usd > 0 AND block_timestamp IS NOT NULL
ORDER BY
  chain_id, block_timestamp DESC, block_index DESC
LIMIT 100;

    `, [chainId, address])

    return result.rows
  } catch (error) {
    console.error(error)
    throw new Error('Failed to fetch transfers')
  }
}
