import db from '@/app/api/db'

const harvests = async (_: any, args: { chainId: number, address: string }) => {
  const { chainId, address } = args
  try {
    const result = await db.query(`
    SELECT
      chain_id AS "chainId",
      address,
      args->>'sender' as sender,
      coalesce(args->>'profit', args->>'gain') as profit,
      coalesce(args->>'profitUsd', args->>'gainUsd') as profitUsd,
      args->>'loss' AS loss,
      args->>'lossUsd' AS "lossUsd",
      args->>'apr.gross' AS "aprGross",
      args->>'apr.net' AS "aprNet",
      block_number AS "blockNumber",
      block_time AS "blockTime",
      log_index AS "logIndex",
      transaction_hash AS "transactionHash"
    FROM evmlog
    WHERE
      (chain_id = $1 OR $1 IS NULL) AND (address = $2 OR $2 IS NULL)
      AND (event_name = 'Reported' OR event_name = 'Harvested')
    ORDER BY
      chain_id, block_time DESC, log_index DESC
    LIMIT 100;`, 
    [chainId, address])

    return result.rows
  } catch (error) {
    console.error(error)
    throw new Error('!harvests')
  }
}

export default harvests
