import db from '.'

export async function getVaults(where: string, values: any[]) {
  const query = `
  WITH strategy_lender_status_agg AS (
    SELECT
      s.chain_id,
      s.address as strategy_address,
      json_agg(json_build_object(
        'chainId', s.chain_id,
        'address', ls.address,
        'name', ls.name,
        'assets', ls.assets,
        'rate', ls.rate
      ) ORDER BY ls.assets DESC
      ) AS results
    FROM strategy s
    JOIN strategy_lender_status ls
      ON s.chain_id = ls.chain_id
      AND s.address = ls.strategy_address
    JOIN vault v
      ON v.chain_id = s.chain_id
      AND v.address = s.vault_address
    ${where}
    GROUP BY s.chain_id, s.address
  ),

  withdrawal_queue_agg AS (
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
        'lenderStatuses', COALESCE(ls.results, '[]'::json),
        'assetAddress', s.asset_address,
        'performanceFee', s.performance_fee,
        'debtRatio', s.debt_ratio,
        'minDebtPerHarvest', s.min_debt_per_harvest::text,
        'maxDebtPerHarvest', s.max_debt_per_harvest::text,
        'lastReportBlockTime', FLOOR(EXTRACT(EPOCH FROM s.last_report_block_time)),
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
        'activationBlockTime', FLOOR(EXTRACT(EPOCH FROM s.activation_block_time)),
        'activationBlockNumber', s.activation_block_number,
        'queueIndex', wq.queue_index
      ) ORDER BY wq.chain_id, wq.vault_address, wq.queue_index ASC
      ) AS results
    FROM vault v
    JOIN withdrawal_queue wq ON v.chain_id = wq.chain_id AND v.address = wq.vault_address
    JOIN strategy_gql s ON wq.chain_id = s.chain_id AND wq.strategy_address = s.address
    LEFT JOIN strategy_lender_status_agg ls ON wq.chain_id = ls.chain_id AND wq.strategy_address = ls.strategy_address
    ${where}
    GROUP BY v.chain_id, v.address
  ),

  latest_harvest_time_agg AS (
    SELECT
      chain_id,
      address,
      MAX(block_time) AS block_time
    FROM harvest v
    ${where}
    GROUP BY chain_id, address
  ),

  default_queue_agg AS (
    SELECT
      v.chain_id,
      v.address,
      json_agg(json_build_object(
        'chainId', s.chain_id,
        'address', s.address,
        'name', s.name,
        'apiVersion', s.api_version,
        'vaultAddress', v.address,
        'netApy', s.apy_net,
        'activationBlockTime', FLOOR(EXTRACT(EPOCH FROM s.activation_block_time)),
        'activationBlockNumber', s.activation_block_number,
        'latestReportBlockTime', FLOOR(EXTRACT(EPOCH FROM lht.block_time)),
        'keeper', s.keeper,
        'doHealthCheck', s.do_health_check,
        'debtRatio', debt.target_debt_ratio,
        'currentDebt', debt.current_debt::text,
        'currentDebtRatio', debt.current_debt_ratio,
        'totalAssets', s.total_assets::text,
        'totalIdle', s.total_idle::text,
        'queueIndex', wq.queue_index
      ) ORDER BY wq.chain_id, wq.vault_address, wq.queue_index ASC
      ) AS results
    FROM vault v
    JOIN withdrawal_queue wq ON v.chain_id = wq.chain_id AND v.address = wq.vault_address
    JOIN vault_gql s ON wq.chain_id = s.chain_id AND wq.strategy_address = s.address
    LEFT JOIN latest_harvest_time_agg lht ON wq.chain_id = lht.chain_id AND wq.strategy_address = lht.address
    LEFT JOIN vault_debt debt ON wq.chain_id = debt.chain_id AND wq.vault_address = debt.lender AND wq.strategy_address = debt.borrower
    ${where}
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
        'time', FLOOR(EXTRACT(EPOCH FROM s.time))
      ) ORDER BY s.time ASC
      ) AS results
    FROM vault v
    JOIN sparkline s
      ON s.type = 'vault-tvl-7d'
      AND v.chain_id = s.chain_id 
      AND v.address = s.address
    ${where}
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
        'time', FLOOR(EXTRACT(EPOCH FROM s.time))
      ) ORDER BY s.time ASC
      ) AS results
    FROM vault v
    JOIN sparkline s
      ON s.type = 'vault-apy-7d'
      AND v.chain_id = s.chain_id 
      AND v.address = s.address
    ${where}
    GROUP BY v.chain_id, v.address
  )

  SELECT
    v.chain_id as "chainId",
    v.address, 
    v.type,
    v.api_version as "apiVersion",
    v.apetax_type as "apetaxType",
    v.apetax_status as "apetaxStatus",
    v.registry_status as "registryStatus",
    v.registry_address as "registryAddress", 
    v.symbol, 
    v.name, 
    v.decimals, 
    v.total_assets as "totalAssets", 
    v.total_idle as "totalIdle",
    v.deposit_limit as "depositLimit",
    v.available_deposit_limit as "availableDepositLimit",
    v.locked_profit_degradation as "lockedProfitDegradation",
    v.total_debt as "totalDebt",
    v.debt_ratio as "debtRatio",
    v.asset_address as "assetAddress", 
    v.asset_name as "assetName", 
    v.asset_symbol as "assetSymbol",
    v.asset_description as "assetDescription",
    v.management_fee as "managementFee",
    v.performance_fee as "performanceFee",
    v.governance,
    v.keeper,
    v.do_health_check as "doHealthCheck",
    v.activation_block_time as "activationBlockTime",
    v.activation_block_number as "activationBlockNumber",
    COALESCE(default_queue_agg.results, '[]'::json) AS "defaultQueue",
    COALESCE(withdrawal_queue_agg.results, '[]'::json) AS "withdrawalQueue",
    COALESCE(tvl_agg.results, '[]'::json) AS "tvlSparkline",
    COALESCE(apy_agg.results, '[]'::json) AS "apySparkline"
  FROM vault_gql v
  LEFT JOIN default_queue_agg 
    ON v.chain_id = default_queue_agg.chain_id 
    AND v.address = default_queue_agg.address
  LEFT JOIN withdrawal_queue_agg 
    ON v.chain_id = withdrawal_queue_agg.chain_id 
    AND v.address = withdrawal_queue_agg.address
  LEFT JOIN tvl_agg
    ON v.chain_id = tvl_agg.chain_id
    AND v.address = tvl_agg.address
  LEFT JOIN apy_agg
    ON v.chain_id = apy_agg.chain_id 
    AND v.address = apy_agg.address
  ${where};
  `
  const vaults = (await db.query(query, values)).rows

  const outputs = (await db.query(
  `SELECT DISTINCT ON(chain_id, address, label, component) * 
  FROM output v
  ${where} AND label in ('apy-bwd-delta-pps', 'tvl', 'price')
  ORDER BY chain_id, address, label, component, block_number DESC`
  , values)).rows

  const results = vaults.map((vault: any) => {
    const apy = outputs.filter((m: any) => m.label === 'apy-bwd-delta-pps' && m.chain_id === vault.chainId && m.address === vault.address)
    const tvl = outputs.filter((m: any) => m.label === 'tvl' && m.component === 'tvl' && m.chain_id === vault.chainId && m.address === vault.address)
    const price = outputs.filter((m: any) => m.label === 'price' && m.chain_id === vault.chainId && m.address === vault.address)
    return {
      ...vault,
      tvlUsd: tvl[0]?.value,
      assetPriceUsd: price[0]?.value,
      assetPriceSource: price[0]?.component,
      apyNet: apy.find((a: any) => a.component === 'net')?.value,
      apyWeeklyNet: apy.find((a: any) => a.component === 'weekly-net')?.value,
      apyMonthlyNet: apy.find((a: any) => a.component === 'monthly-net')?.value,
      apyInceptionNet: apy.find((a: any) => a.component === 'inception-net')?.value,
      aprGross: apy.find((a: any) => a.component === 'gross-apr')?.value
    }
  })

  return results
}
