import { z } from 'zod'
import { parseAbi, toEventSelector } from 'viem'
import { fetchOrExtractAsset, fetchOrExtractDecimals } from '../../../../lib'
import { fetchErc20PriceUsd } from '../../../../../../prices'
import { priced } from 'lib/math'
import { EvmLog, EvmLogSchema, zhexstring } from 'lib/types'
import { first } from '../../../../../../db'
import { math, multicall3 } from 'lib'
import { rpcs } from '../../../../../../rpcs'
import { getBlockTime } from 'lib/blocks'

export const topics = [
  `event StrategyReported(address indexed strategy, uint256 gain, uint256 loss, uint256 debtPaid, uint256 totalGain, uint256 totalLoss, uint256 totalDebt, uint256 debtAdded, uint256 debtRatio)`
].map(e => toEventSelector(e))

export const HarvestSchema = z.object({
  chainId: z.number(),
  address: zhexstring,
  blockNumber: z.bigint({ coerce: true }),
  blockTime: z.bigint({ coerce: true }),
  args: z.object({
    strategy: zhexstring,
    gain: z.bigint({ coerce: true }),
    loss: z.bigint({ coerce: true }),
    debtPaid: z.bigint({ coerce: true }),
    totalGain: z.bigint({ coerce: true }),
    totalLoss: z.bigint({ coerce: true }),
    totalDebt: z.bigint({ coerce: true }),
    debtAdded: z.bigint({ coerce: true }),
    debtRatio: z.bigint({ coerce: true })
  })
})

export type Harvest = z.infer<typeof HarvestSchema>

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const harvest = HarvestSchema.parse({
    chainId, address, blockTime: await getBlockTime(chainId, data.blockNumber), ...data
  })

  const decimals = await fetchOrExtractDecimals(chainId, address)
  const asset = await fetchOrExtractAsset(chainId, address, 'vault', 'token')
  const price = await fetchErc20PriceUsd(chainId, asset, harvest.blockNumber)

  const previousLog = await first<EvmLog>(EvmLogSchema, `
  SELECT * from evmlog 
  WHERE chain_id = $1 AND address = $2 AND signature = $3 AND args->>'strategy' = $4 AND block_number < $5
  ORDER BY block_number DESC, log_index DESC LIMIT 1`,
  [chainId, address, topics[0], harvest.args.strategy, harvest.blockNumber])
  const previousHarvest = previousLog ? HarvestSchema.parse(previousLog) : undefined
  const apr = multicall3.supportsBlock(chainId, data.blockNumber)
  ? await computeApr(harvest, previousHarvest)
  : { gross: 0, net: 0 }

  return {
    gainUsd: priced(harvest.args.gain, decimals, price.priceUsd),
    lossUsd: priced(harvest.args.loss, decimals, price.priceUsd),
    debtPaidUsd: priced(harvest.args.debtPaid, decimals, price.priceUsd),
    totalGainUsd: priced(harvest.args.totalGain, decimals, price.priceUsd),
    totalLossUsd: priced(harvest.args.totalLoss, decimals, price.priceUsd),
    totalDebtUsd: priced(harvest.args.totalDebt, decimals, price.priceUsd),
    debtAddedUsd: priced(harvest.args.debtAdded, decimals, price.priceUsd),
    priceUsd: price.priceUsd,
    priceSource: price.priceSource,
    apr
  }
}

export async function computeApr(latest: Harvest, previous: Harvest | undefined) {
  if(!previous) return { gross: 0, net: 0 }

  if(!(latest.args.totalDebt && previous.args.totalDebt)) return { 
    gross: 0, net: 0, blockNumber: latest.blockNumber 
  }

  const profit = (latest.args.totalGain || 0n) - (previous.args.totalGain || 0n)
  const loss = (latest.args.totalLoss || 0n) - (previous.args.totalLoss || 0n)

  const performance = (loss > profit)
  ? math.div(-loss, previous.args.totalDebt)
  : math.div(profit, previous.args.totalDebt)

  const periodInHours = Number(((latest.blockTime || 0n) - (previous.blockTime || 0n)) / (60n * 60n)) || 1
  const hoursInOneYear = 24 * 365
  const gross = performance * hoursInOneYear / periodInHours

  if(gross < 0) return { gross, net: gross }

  const { vault, delegatedAssets } = await getStrategyInfo(latest.chainId, latest.address, latest.blockNumber)
  const fees = await extractFees(latest.chainId, vault, latest.blockNumber)
  const ratioOfDelegatedAssets = math.div(BigInt(delegatedAssets), BigInt(previous.args.totalDebt))
  const net = gross * (1 - fees.performance) - (fees.management * (1 - ratioOfDelegatedAssets))

  return { gross, net }
}

async function getStrategyInfo(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const multicallResult = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
    {
      address, functionName: 'vault',
      abi: parseAbi(['function vault() view returns (address)'])
    },
    {
      address, functionName: 'delegatedAssets',
      abi: parseAbi(['function delegatedAssets() view returns (uint256)'])
    }
  ], blockNumber })

  return {
    vault: multicallResult[0].result as `0x${string}`,
    delegatedAssets: (multicallResult[1].result || 0n) as bigint
  }
}

export async function extractFees(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const bps = await extractFeesBps(chainId, address, blockNumber)
  return {
    performance: math.div(bps.performance, 10_000n),
    management: math.div(bps.management, 10_000n)
  }
}

export async function extractFeesBps(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const multicallResult = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
    {
      address, functionName: 'performanceFee',
      abi: parseAbi(['function performanceFee() returns (uint256)'])
    },
    {
      address, functionName: 'managementFee',
      abi: parseAbi(['function managementFee() returns (uint256)'])
    }
  ], blockNumber })

  return {
    performance: multicallResult[0].result || 0n,
    management: multicallResult[1].result || 0n
  }
}
