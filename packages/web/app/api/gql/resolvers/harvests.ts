import db from '../../db'

const byStrategy = async (chainId?: number, address?: string, limit?: number) => {
  const harvests = (await db.query(`
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
    harvest_gql
  WHERE
    (chain_id = $1 OR $1 IS NULL) 
    AND (address = $2 OR $2 IS NULL)
    AND block_time IS NOT NULL
  ORDER BY
    chain_id, block_time DESC, block_index DESC
  LIMIT $3;
  `, [chainId, address, limit || 1000])).rows

  const outputs = (await db.query(
  `SELECT DISTINCT ON(chain_id, address, label, component) * 
  FROM output
  WHERE (chain_id = $1 OR $1 IS NULL) AND (address = $2 OR $2 IS NULL) AND label = 'apr-spot-harvest'
  ORDER BY chain_id, address, label, component, block_number DESC`
  , [chainId, address])).rows

  return harvests.map((harvest: any) => {
    const apr = outputs.filter((m: any) => m.label === 'apr-spot-harvest' && m.chain_id === harvest.chainId && m.address === harvest.address)
    return {
      ...harvest,
      aprGross: apr.find((a: any) => a.component === 'gross')?.value,
      aprNet: apr.find((a: any) => a.component === 'net')?.value
    }
  })
}

const byVault = async (chainId: number, address: string, limit?: number) => {
  const harvests = (await db.query(`
  SELECT
    h.chain_id AS "chainId",
    h.address,
    h.profit AS profit,
    h.profit_usd AS "profitUsd",
    h.loss AS loss,
    h.loss_usd AS "lossUsd",
    h.total_profit AS "totalProfit",
    h.total_profit_usd AS "totalProfitUsd",
    h.total_loss AS "totalLoss",
    h.total_loss_usd AS "totalLossUsd",
    h.total_debt AS "totalDebt",
    h.block_number AS "blockNumber",
    h.block_index AS "blockIndex",
    h.block_time AS "blockTime",
    h.transaction_hash AS "transactionHash"
  FROM
    harvest_gql h
  JOIN withdrawal_queue wq ON h.chain_id = wq.chain_id AND h.address = wq.strategy_address
  JOIN vault v ON v.chain_id = wq.chain_id AND v.address = wq.vault_address
  WHERE
    h.chain_id = $1 
    AND v.address = $2
    AND h.block_time IS NOT NULL
  ORDER BY
    h.chain_id, h.block_time DESC, h.block_index DESC
  LIMIT $3;
  `, [chainId, address, limit || 1000])).rows

  const strategies = harvests.map(h => h.strategy_address)

  const outputs = (await db.query(
  `SELECT DISTINCT ON(chain_id, address, label, component) * 
  FROM output
  WHERE AND chain_id = $1 AND address IN $2 AND label = 'apr-spot-harvest'
  ORDER BY chain_id, address, label, component, block_number DESC`
  , [chainId, strategies])).rows

  return harvests.map((harvest: any) => {
    const apr = outputs.filter((m: any) => m.label === 'apr-spot-harvest' && m.chain_id === harvest.chainId && m.address === harvest.address)
    return {
      ...harvest,
      aprGross: apr.find((a: any) => a.component === 'gross')?.value,
      aprNet: apr.find((a: any) => a.component === 'net')?.value
    }
  })
}

const harvests = async (_: any, args: { chainId?: number, address?: string, limit?: number }) => {
  const { chainId, address, limit } = args

  try {
    if(chainId && address) {
      const isVault = (await db.query(`SELECT 1 FROM vault WHERE chain_id = $1 AND address = $2 AND type = 'vault';`, [chainId, address])).rows.length > 0
      if(isVault) {
        return await byVault(chainId, address, limit)
      }
    }

    return await byStrategy(chainId, address, limit)
  } catch (error) {
    console.error(error)
    throw new Error('!harvests')
  }
}

export default harvests
