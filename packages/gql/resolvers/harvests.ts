import db from '../db'

export default async (_: any, args: { chainId?: number, address?: string }) => {
  const { chainId, address } = args
  try {
    const result = await db.query(`

SELECT
  chain_id AS "chainId",
  address,
  profit AS profit,
  profit_usd AS "profitUsd",
  loss AS loss,
  loss_usd AS "lossUsd",
  total_profit AS "totalProfit",
  total_profit_usd AS "totalProfitUsd",
  total_loss AS "totalLoss",
  total_loss_usd AS "totalLossUsd",
  total_debt AS "totalDebt",
  block_number AS "blockNumber",
  block_index AS "blockIndex",
  block_time AS "blockTime",
  transaction_hash AS "transactionHash"
FROM
  harvest
WHERE
  (chain_id = $1 OR $1 IS NULL) AND (address = $2 OR $2 IS NULL)
  AND block_time IS NOT NULL
ORDER BY
  chain_id, block_time DESC, block_index DESC
LIMIT 100;
    `, [chainId, address])

    return result.rows
  } catch (error) {
    console.error(error)
    throw new Error('Failed to fetch harvests')
  }
}
