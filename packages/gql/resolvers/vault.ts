import db from '../db'

export default async (_: any, args: { chainId: number, address: string }) => {
  const { chainId, address } = args
  try {
    const result = await db.query(`
    WITH withdrawal_queue_agg AS (
      SELECT
        v.chain_id,
        v.address,
        json_agg(json_build_object(
          'chainId', s.chain_id,
          'address', s.address,
          'name', s.name,
          'apiVersion', s.api_version,
          'vaultAddress', v.address,
          'grossApr', s.gross_apr,
          'netApr', s.net_apr,
          'activationBlockTime', s.activation_block_time,
          'activationBlockNumber', s.activation_block_number,
          'asOfBlockNumber', s.as_of_block_number,
          'queueIndex', wq.queue_index
        ) ORDER BY wq.chain_id, wq.vault_address, wq.queue_index ASC
        ) AS results
      FROM vault v
      JOIN withdrawal_queue wq ON v.chain_id = wq.chain_id AND v.address = wq.vault_address
      JOIN strategy_gql s ON wq.chain_id = s.chain_id AND wq.strategy_address = s.address
      WHERE v.chain_id = $1 AND v.address = $2
      GROUP BY v.chain_id, v.address
    ),
    
    tvl_agg AS (
      SELECT
        v.chain_id,
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
      WHERE v.chain_id = $1 AND v.address = $2
      GROUP BY v.chain_id, v.address
    ),

    apy_agg AS (
      SELECT
        v.chain_id,
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
        ON s.type = 'vault-apy-7d'
        AND v.chain_id = s.chain_id 
        AND v.address = s.address
      WHERE v.chain_id = $1 AND v.address = $2
      GROUP BY v.chain_id, v.address
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
      v.available_deposit_limit as "availableDepositLimit",
      v.asset_address as "assetAddress", 
      v.asset_name as "assetName", 
      v.asset_symbol as "assetSymbol", 
      v.price_usd as "priceUsd",
      v.tvl_usd as "tvlUsd",
      v.apy_net as "apyNet",
      v.management_fee as "managementFee",
      v.performance_fee as "performanceFee",
      v.governance,
      v.activation_block_time as "activationBlockTime",
      v.activation_block_number as "activationBlockNumber",
      v.as_of_block_number as "asOfBlockNumber",
      withdrawal_queue_agg.results AS "withdrawalQueue",
      COALESCE(tvl_agg.results, '[]'::json) AS "tvlSparkline",
      COALESCE(apy_agg.results, '[]'::json) AS "apySparkline"
    FROM vault_gql v
    JOIN withdrawal_queue_agg 
      ON v.chain_id = withdrawal_queue_agg.chain_id 
      AND v.address = withdrawal_queue_agg.address
    LEFT JOIN tvl_agg
      ON v.chain_id = tvl_agg.chain_id
      AND v.address = tvl_agg.address
    LEFT JOIN apy_agg
      ON v.chain_id = apy_agg.chain_id 
      AND v.address = apy_agg.address
    WHERE v.chain_id = $1 AND v.address = $2;
    `, [chainId, address])

    return result.rows[0]
  } catch (error) {
    console.error(error)
    throw new Error('!vault')
  }
}
