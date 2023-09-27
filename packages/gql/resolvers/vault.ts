import db from '../db'

export default async (_: any, args: { chainId: number, address: string }) => {
  const { chainId, address } = args
  const query = `
    SELECT 
      chain_id as "chainId",
      address, 
      api_version as "apiVersion",
      apetax_type as "apetaxType",
      apetax_status as "apetaxStatus",
      registry_status as "registryStatus",
      registry_address as "registryAddress", 
      symbol, 
      name, 
      decimals, 
      total_assets as "totalAssets", 
      asset_address as "assetAddress", 
      asset_name as "assetName", 
      asset_symbol as "assetSymbol", 
      activation_timestamp as "activationTimestamp",
      activation_block_number as "activationBlockNumber",
      as_of_block_number as "asOfBlockNumber" 
    FROM vault 
    WHERE chain_id = $1 AND address = $2
  `
  const values = [chainId, address]

  try {
    const res = await db.query(query, values)
    const [ result ] = res.rows

    const queue = (await db.query(`
      SELECT 
        withdrawal_queue.chain_id as "chainId",
        withdrawal_queue.vault_address as "vaultAddress", 
        withdrawal_queue.strategy_address as "strategyAddress",
        withdrawal_queue.queue_index as "queueIndex",
        strategy.name,
        strategy.api_version as "apiVersion",
        strategy.activation_timestamp as "activationTimestamp",
        strategy.activation_block_number as "activationBlockNumber",
        strategy.as_of_block_number as "asOfBlockNumber"
      FROM withdrawal_queue
      INNER JOIN strategy ON strategy.address = withdrawal_queue.strategy_address
      WHERE withdrawal_queue.chain_id = $1 AND withdrawal_queue.vault_address = $2
      ORDER BY withdrawal_queue.chain_id, withdrawal_queue.vault_address, withdrawal_queue.queue_index ASC
      `, 
      [chainId, address]
    )).rows

    result.withdrawalQueue = queue.map(q => ({
      chainId: q.chainId,
      address: q.strategyAddress,
      name: q.name,
      apiVersion: q.apiVersion,
      activationTimestamp: q.activationTimestamp,
      activationBlockNumber: q.activationBlockNumber,
      asOfBlockNumber: q.asOfBlockNumber
    }))

    return result

  } catch (error) {
    console.error(error)
    throw new Error('Failed to fetch vault')
  }
}
