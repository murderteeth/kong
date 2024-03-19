import { z } from 'zod'
import { parseAbi, toEventSelector, zeroAddress } from 'viem'
import { rpcs } from '../../../../../rpcs'
import { RiskScoreSchema, ThingSchema, TokenMetaSchema, VaultMetaSchema, zhexstring } from 'lib/types'
import { math, mq } from 'lib'
import { estimateCreationBlock, getBlockTime } from 'lib/blocks'
import db, { getSparkline } from '../../../../../db'
import { fetchErc20PriceUsd } from '../../../../../prices'
import { priced } from 'lib/math'
import { getRiskScore } from '../../../lib/risk'
import { getTokenMeta, getVaultMeta } from '../../../lib/meta'
import abi from '../abi.json'

export const ResultSchema = z.object({
  strategies: z.array(zhexstring),
  allocator: zhexstring.optional(),
  debts: z.array(z.object({
    strategy: zhexstring,
    currentDebt: z.bigint(),
    currentDebtUsd: z.number(),
    maxDebt: z.bigint(),
    maxDebtUsd: z.number(),
    targetDebtRatio: z.number().optional(),
    maxDebtRatio: z.number().optional()
  })),
  fees: z.object({
    managementFee: z.number(),
    performanceFee: z.number()
  }),
  unlock: z.object({
    unlockedShares: z.bigint(),
    unlockedAssets: z.bigint()
  }),
  risk: RiskScoreSchema,
  meta: VaultMetaSchema.merge(z.object({ token: TokenMetaSchema }))
})

export const SnapshotSchema = z.object({
  accountant: zhexstring.optional()
})

type Snapshot = z.infer<typeof SnapshotSchema>

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const snapshot = SnapshotSchema.parse(data)
  const strategies = await projectStrategies(chainId, address)
  const allocator = await projectDebtAllocator(chainId, address)
  const debts = await extractDebts(chainId, address)
  const fees = await extractFeesBps(chainId, address, snapshot)
  const unlock = await extractUnlock(chainId, address)
  const risk = await getRiskScore(chainId, address)
  const meta = await getVaultMeta(chainId, address)
  const token = await getTokenMeta(chainId, data.asset)

  if (snapshot.accountant) {
    const incept = await estimateCreationBlock(chainId, snapshot.accountant)
    await mq.add(mq.job.load.thing, ThingSchema.parse({
      chainId,
      address: snapshot.accountant,
      label: 'accountant',
      defaults: {
        inceptBlock: incept.number,
        inceptTime: incept.timestamp
      }
    }))
  }

  const sparklines = {
    tvl: await getSparkline(chainId, address, 'tvl'),
    apy: await getSparkline(chainId, address, 'apy-bwd-delta-pps', 'net')
  }

  return { strategies, allocator, debts, fees, risk, meta: { ...meta, token }, sparklines }
}

export async function projectStrategies(chainId: number, vault: `0x${string}`, blockNumber?: bigint) {
  const changeType = { [2 ** 0]: 'add', [2 ** 1]: 'revoke' }
  const topic = toEventSelector('event StrategyChanged(address indexed strategy, uint256 change_type)')
  const events = await db.query(`
  SELECT args
  FROM evmlog
  WHERE chain_id = $1 AND address = $2 AND signature = $3 AND (block_number <= $4 OR $4 IS NULL)
  ORDER BY block_number, log_index ASC`,
  [chainId, vault, topic, blockNumber])
  if(events.rows.length === 0) return []
  const result: `0x${string}`[] = []
  for (const event of events.rows) {
    if (changeType[event.args.change_type] === 'add') {
      result.push(zhexstring.parse(event.args.strategy))
    } else {
      result.splice(result.indexOf(zhexstring.parse(event.args.strategy)), 1)
    }
  }
  return result
}

export async function projectDebtAllocator(chainId: number, vault: `0x${string}`, blockNumber?: bigint) {
  const topic = toEventSelector('event NewDebtAllocator(address indexed allocator, address indexed vault)')
  const events = await db.query(`
  SELECT args 
  FROM evmlog 
  WHERE chain_id = $1 AND signature = $2 AND args->>'vault' = $3 AND (block_number <= $4 OR $4 IS NULL)
  ORDER BY block_number, log_index DESC
  LIMIT 1`, 
  [chainId, topic, vault, blockNumber])
  if(events.rows.length === 0) return undefined
  return zhexstring.parse(events.rows[0].args.allocator)
}

export async function extractDebts(chainId: number, vault: `0x${string}`, blockNumber?: bigint) {
  const results: {
    strategy: `0x${string}`,
    currentDebt: bigint,
    currentDebtUsd: number,
    maxDebt: bigint,
    maxDebtUsd: number,
    targetDebtRatio: number | undefined,
    maxDebtRatio: number | undefined
  }[] = []

  const snapshot = await db.query(
    `SELECT
      snapshot->'asset' AS asset,
      snapshot->'decimals' AS decimals
    FROM snapshot
    WHERE chain_id = $1 AND address = $2`,
    [chainId, vault]
  )

  const { asset, decimals } = z.object({
    asset: zhexstring.nullish(),
    decimals: z.number().nullish()
  }).parse(snapshot.rows[0] || {})

  const strategies = await projectStrategies(chainId, vault, blockNumber)
  const allocator = await projectDebtAllocator(chainId, vault, blockNumber)

  if (asset && decimals && strategies && allocator) {
    for (const strategy of strategies) {
      const multicall = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
        {
          address: vault, functionName: 'strategies', args: [strategy],
          abi: parseAbi(['function strategies(address) view returns (uint256, uint256, uint256, uint256)'])
        },
        {
          address: allocator || zeroAddress, functionName: 'getStrategyTargetRatio', args: [strategy],
          abi: parseAbi(['function getStrategyTargetRatio(address) view returns (uint256)'])
        }, 
        {
          address: allocator || zeroAddress, functionName: 'getStrategyMaxRatio', args: [strategy],
          abi: parseAbi(['function getStrategyMaxRatio(address) view returns (uint256)'])
        }
      ], blockNumber })

      if(multicall.some(result => result.status !== 'success')) throw new Error('!multicall.success')
      const [activation, lastReport, currentDebt, maxDebt] = multicall[0].result!
      const targetDebtRatio = allocator ? Number(multicall[1].result!) : undefined
      const maxDebtRatio = allocator ? Number(multicall[2].result!) : undefined
      const price = await fetchErc20PriceUsd(chainId, asset)

      results.push({
        strategy,
        currentDebt,
        currentDebtUsd: priced(currentDebt, decimals, price.priceUsd),
        maxDebt,
        maxDebtUsd: priced(maxDebt, decimals, price.priceUsd),
        targetDebtRatio,
        maxDebtRatio
      })
    }
  }

  return results
}

export async function extractFeesBps(chainId: number, address: `0x${string}`, snapshot: Snapshot) {
  if(snapshot.accountant && snapshot.accountant !== zeroAddress) {
    const defaultConfig = await rpcs.next(chainId).readContract({
      address: snapshot.accountant,
      abi: parseAbi(['function defaultConfig() view returns (uint16, uint16, uint16, uint16, uint16, uint16)']),
      functionName: 'defaultConfig'
    })
    return {
      managementFee: defaultConfig[0],
      performanceFee: defaultConfig[1]
    }
  } else {
    const performanceFee = await rpcs.next(chainId).readContract({
      address,
      abi: parseAbi(['function performanceFee() view returns (uint16)']),
      functionName: 'performanceFee'
    })
    return {
      managementFee: 0,
      performanceFee: performanceFee
    }
  }
}

export async function extractUnlock(chainId: number, vault: `0x${string}`, blockNumber?: bigint) {
  const DAY = 24 * 60 * 60
  const MAX_BPS_EXTENDED = 1_000_000_000_000n
  const blockTime = await getBlockTime(chainId, blockNumber)

  const multicall = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
    { address: vault, abi, functionName: 'fullProfitUnlockDate' },
    { address: vault, abi, functionName: 'profitUnlockingRate' }
  ], blockNumber })

  if (multicall.some(result => result.status !== 'success')) throw new Error('!multicall.success')

  const fullProfitUnlockDate = multicall[0].result! as bigint
  const profitUnlockingRate = multicall[1].result! as bigint

  let unlockedShares = 0n
  if((fullProfitUnlockDate || 0n) > blockTime) {
    const period = math.min(BigInt(DAY), (fullProfitUnlockDate || 0n) - blockTime)
    unlockedShares = (period * (profitUnlockingRate || 0n)) / MAX_BPS_EXTENDED
  }

  const unlockedAssets = await rpcs.next(chainId, blockNumber).readContract({
    address: vault,
    abi: parseAbi(['function convertToAssets(uint256) view returns (uint256)']),
    functionName: 'convertToAssets',
    args: [unlockedShares],
    blockNumber
  })

  return { 
    unlockedShares,
    unlockedAssets
  }
}
