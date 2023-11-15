import { Pool } from 'pg'

const db = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: (process.env.POSTGRES_PORT || 5432) as number,
  database: process.env.POSTGRES_DATABASE || 'user',
  user: process.env.POSTGRES_USER || 'user',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 10,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 5_000,
})

export default db

export async function getVaults(where: string, aggGroupBy: string, values: any[]) {
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
        'estimatedTotalAssets', s.estimated_total_assets::text,
        'delegatedAssets', s.delegated_assets::text,
        'assetAddress', s.asset_address,
        'performanceFee', s.performance_fee,
        'debtRatio', s.debt_ratio,
        'minDebtPerHarvest', s.min_debt_per_harvest::text,
        'maxDebtPerHarvest', s.max_debt_per_harvest::text,
        'lastReportBlockTime', s.last_report_block_time,
        'totalDebt', s.total_debt::text,
        'totalDebtUsd', s.total_debt_usd,
        'totalGain', s.total_gain::text,
        'totalLoss', s.total_loss::text,
        'withdrawalQueueIndex', s.withdrawal_queue_index,
        'keeper', s.keeper,
        'strategist', s.strategist,
        'healthCheck', s.health_check,
        'doHealthCheck', s.do_health_check,
        'tradeFactory', s.trade_factory,
        'description', s.meta_description,
        'riskGroup', s.risk_group,
        'activationBlockTime', s.activation_block_time,
        'activationBlockNumber', s.activation_block_number,
        'asOfBlockNumber', s.as_of_block_number,
        'queueIndex', wq.queue_index
      ) ORDER BY wq.chain_id, wq.vault_address, wq.queue_index ASC
      ) AS results
    FROM vault v
    JOIN withdrawal_queue wq ON v.chain_id = wq.chain_id AND v.address = wq.vault_address
    JOIN strategy_gql s ON wq.chain_id = s.chain_id AND wq.strategy_address = s.address
    ${where}
    ${aggGroupBy}
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
    ${where}
    ${aggGroupBy}
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
    ${where}
    ${aggGroupBy}
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
    v.locked_profit_degradation as "lockedProfitDegradation",
    v.total_debt as "totalDebt",
    v.debt_ratio as "debtRatio",
    v.asset_address as "assetAddress", 
    v.asset_name as "assetName", 
    v.asset_symbol as "assetSymbol",
    v.asset_description as "assetDescription",
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
  ${where};
  `, values)

  return result.rows
}
