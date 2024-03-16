import { z } from 'zod'
import { parseAbi, toEventSelector, zeroAddress } from 'viem'
import { rpcs } from '../../../../../rpcs'
import { zhexstring } from 'lib/types'
import db from '../../../../../db'
import { fetchErc20PriceUsd } from '../../../../../prices'
import { priced } from 'lib/math'
import { getRiskScore } from '../../../lib/risk'

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const strategies = await projectStrategies(chainId, address)
  const withdrawalQueue = await extractWithdrawalQueue(chainId, address)
  const debts = await extractDebts(chainId, address)
  const risk = await getRiskScore(chainId, address)
  return { strategies, withdrawalQueue, debts, risk }
}

export async function projectStrategies(chainId: number, vault: `0x${string}`, blockNumber?: bigint) {
  const topics = [
    toEventSelector('event StrategyAdded(address indexed strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)'),
    toEventSelector('event StrategyMigrated(address indexed oldVersion, address indexed newVersion)'),
    toEventSelector('event StrategyRevoked(address indexed strategy)')
  ]

  const events = await db.query(`
  SELECT signature, args
  FROM evmlog
  WHERE chain_id = $1 AND address = $2 AND signature = ANY($3) AND (block_number <= $4 OR $4 IS NULL)
  ORDER BY block_number, log_index ASC`,
  [chainId, vault, topics, blockNumber])
  if(events.rows.length === 0) return []

  const result: `0x${string}`[] = []

  for (const event of events.rows) {
    switch (event.signature) {
      case topics[0]:
        result.push(zhexstring.parse(event.args.strategy))
        break
      case topics[1]:
        result.push(zhexstring.parse(event.args.newVersion))
        break
      case topics[2]:
        result.splice(result.indexOf(zhexstring.parse(event.args.strategy)), 1)
        break
    }
  }

  return result
}

async function extractDebts(chainId: number, vault: `0x${string}`) {
  const results = z.object({
    strategy: zhexstring,
    performanceFee: z.bigint({ coerce: true }),
    activation: z.bigint({ coerce: true }),
    debtRatio: z.bigint({ coerce: true }),
    minDebtPerHarvest: z.bigint({ coerce: true }),
    maxDebtPerHarvest: z.bigint({ coerce: true }),
    lastReport: z.bigint({ coerce: true }),
    totalDebt: z.bigint({ coerce: true }),
    totalDebtUsd: z.number(),
    totalGain: z.bigint({ coerce: true }),
    totalGainUsd: z.number(),
    totalLoss: z.bigint({ coerce: true }),
    totalLossUsd: z.number()
  }).array().parse([])

  const snapshot = await db.query(
    `SELECT
      snapshot->'token' AS token,
      snapshot->'decimals' AS decimals,
      hook->'strategies' AS strategies
    FROM snapshot
    WHERE chain_id = $1 AND address = $2`,
    [chainId, vault]
  )

  const { token, decimals, strategies } = z.object({
    token: zhexstring.nullish(),
    decimals: z.number({ coerce: true }).nullish(),
    strategies: zhexstring.array().nullish()
  }).parse(snapshot.rows[0] || {})

  if (!(token && decimals && strategies) || strategies.length === 0) return []

  const abi = parseAbi(['function strategies(address) view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)'])
  const multicall = await rpcs.next(chainId).multicall({ contracts: strategies.map(strategy => ({
    address: vault, functionName: 'strategies', args: [strategy], abi
  })) })

  if(multicall.some(result => result.status !== 'success')) throw new Error('!multicall.success')

  for (let i = 0; i < strategies.length; i++) {
    const [
      performanceFee,
      activation,
      debtRatio,
      minDebtPerHarvest,
      maxDebtPerHarvest,
      lastReport,
      totalDebt,
      totalGain,
      totalLoss
    ] = multicall[i].result!

    const { priceUsd } = await fetchErc20PriceUsd(chainId, token)
    const totalDebtUsd = priced(totalDebt, decimals, priceUsd)
    const totalGainUsd = priced(totalGain, decimals, priceUsd)
    const totalLossUsd = priced(totalLoss, decimals, priceUsd)

    results.push({
      strategy: strategies[i],
      performanceFee,
      activation,
      debtRatio,
      minDebtPerHarvest,
      maxDebtPerHarvest,
      lastReport,
      totalDebt,
      totalDebtUsd,
      totalGain,
      totalGainUsd,
      totalLoss,
      totalLossUsd
    })
  }

  return results
}

export async function extractWithdrawalQueue(chainId: number, address: `0x${string}`, blockNumber?: bigint) {
  const abi = parseAbi(['function withdrawalQueue(uint256) view returns (address)'])

  const multicall = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
    { args: [0n], address, functionName: 'withdrawalQueue', abi },
    { args: [1n], address, functionName: 'withdrawalQueue', abi },
    { args: [2n], address, functionName: 'withdrawalQueue', abi },
    { args: [3n], address, functionName: 'withdrawalQueue', abi },
    { args: [4n], address, functionName: 'withdrawalQueue', abi },
    { args: [5n], address, functionName: 'withdrawalQueue', abi },
    { args: [6n], address, functionName: 'withdrawalQueue', abi },
    { args: [7n], address, functionName: 'withdrawalQueue', abi },
    { args: [8n], address, functionName: 'withdrawalQueue', abi },
    { args: [9n], address, functionName: 'withdrawalQueue', abi },
    { args: [10n], address, functionName: 'withdrawalQueue', abi },
    { args: [11n], address, functionName: 'withdrawalQueue', abi },
    { args: [12n], address, functionName: 'withdrawalQueue', abi },
    { args: [13n], address, functionName: 'withdrawalQueue', abi },
    { args: [14n], address, functionName: 'withdrawalQueue', abi },
    { args: [15n], address, functionName: 'withdrawalQueue', abi },
    { args: [16n], address, functionName: 'withdrawalQueue', abi },
    { args: [17n], address, functionName: 'withdrawalQueue', abi },
    { args: [18n], address, functionName: 'withdrawalQueue', abi },
    { args: [19n], address, functionName: 'withdrawalQueue', abi }
  ], blockNumber })

  return multicall.filter(result => result.status === 'success' && result.result && result.result !== zeroAddress)
  .map(result => result.result as `0x${string}`)
}
