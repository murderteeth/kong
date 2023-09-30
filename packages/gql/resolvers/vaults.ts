import db from '../db'

export default async (_: any, args: { chainId?: number }) => {
  const { chainId } = args
  try {
    const result = await db.query(`
    WITH withdrawal_queue_agg AS (
      SELECT
        v.address,
        json_agg(json_build_object(
          'chainId', s.chain_id,
          'address', s.address,
          'name', s.name,
          'apiVersion', s.api_version,
          'vaultAddress', v.address,
          'activationTimestamp', s.activation_timestamp,
          'activationBlockNumber', s.activation_block_number,
          'asOfBlockNumber', s.as_of_block_number,
          'queueIndex', wq.queue_index
        ) ORDER BY wq.chain_id, wq.vault_address, wq.queue_index ASC
        ) AS results
      FROM vault v
      JOIN withdrawal_queue wq ON v.chain_id = wq.chain_id AND v.address = wq.vault_address
      JOIN strategy s ON wq.chain_id = s.chain_id AND wq.strategy_address = s.address
      WHERE v.chain_id = $1 OR $1 IS NULL
      GROUP BY v.address
    ),
    
    tvl_agg AS (
      SELECT
        v.address,
        json_agg(json_build_object(
          'chainId', s.chain_id,
          'address', s.address,
          'type', s.type,
          'value', s.value,
          'time', s.time
        ) ORDER BY s.time ASC
        ) AS results
      FROM vault v
      JOIN sparkline s
        ON s.type = 'vault-tvl-7d' 
        AND v.chain_id = s.chain_id 
        AND v.address = s.address
      WHERE v.chain_id = $1 OR $1 IS NULL
      GROUP BY v.address
    )
    
    SELECT
      v.chain_id as "chainId",
      v.address, 
      v.api_version as "apiVersion",
      v.apetax_type as "apetaxType",
      v.apetax_status as "apetaxStatus",
      v.registry_status as "registryStatus",
      v.registry_address as "registryAddress", 
      v.symbol, 
      v.name, 
      v.decimals, 
      v.total_assets as "totalAssets", 
      v.asset_address as "assetAddress", 
      v.asset_name as "assetName", 
      v.asset_symbol as "assetSymbol", 
      v.activation_timestamp as "activationTimestamp",
      v.activation_block_number as "activationBlockNumber",
      v.as_of_block_number as "asOfBlockNumber",
      withdrawal_queue_agg.results AS "withdrawalQueue",
      COALESCE(tvl_agg.results, '[]'::json) AS "tvlSparkline"
    FROM vault v
    JOIN withdrawal_queue_agg ON v.address = withdrawal_queue_agg.address
    LEFT JOIN tvl_agg ON v.address = tvl_agg.address
    WHERE v.chain_id = $1 OR $1 IS NULL;
    `, [chainId])

    return result.rows
  } catch (error) {
    console.error(error)
    throw new Error('Failed to fetch vaults')
  }
}
