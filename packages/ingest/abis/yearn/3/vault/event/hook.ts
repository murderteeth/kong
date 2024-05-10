import { z } from 'zod'
import { parseAbi, toEventSelector } from 'viem'
import { priced } from 'lib/math'
import { fetchOrExtractAssetAddress, fetchOrExtractDecimals } from '../../../lib'
import { fetchErc20PriceUsd } from '../../../../../prices'
import { EvmAddressSchema, EvmLog, EvmLogSchema } from 'lib/types'
import { getBlockTime } from 'lib/blocks'
import { first } from '../../../../../db'
import { rpcs } from '../../../../../rpcs'
import { math } from 'lib'

export const topics = [
  `event StrategyReported(address indexed strategy, uint256 gain, uint256 loss, uint256 current_debt, uint256 protocol_fees, uint256 total_fees, uint256 total_refunds)`
].map(e => toEventSelector(e))

export const HarvestSchema = z.object({
  chainId: z.number(),
  address: EvmAddressSchema,
  blockNumber: z.bigint({ coerce: true }),
  blockTime: z.bigint({ coerce: true }),
  args: z.object({
    strategy: EvmAddressSchema,
    gain: z.bigint({ coerce: true }),
    loss: z.bigint({ coerce: true }),
    current_debt: z.bigint({ coerce: true }),
    protocol_fees: z.bigint({ coerce: true }),
    total_fees: z.bigint({ coerce: true }),
    total_refunds: z.bigint({ coerce: true })
  })
})

export type Harvest = z.infer<typeof HarvestSchema>

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const harvest = HarvestSchema.parse({
    chainId, address, blockTime: await getBlockTime(chainId, data.blockNumber), ...data
  })

  const decimals = await fetchOrExtractDecimals(chainId, address)
  const asset = await fetchOrExtractAssetAddress(chainId, address, 'vault', 'asset')
  const price = await fetchErc20PriceUsd(chainId, asset, harvest.blockNumber)
  const previousHarvest = await fetchPreviousHarvest(harvest)
  const apr = await computeApr(harvest, previousHarvest)

  return {
    gainUsd: priced(harvest.args.gain, decimals, price.priceUsd),
    lossUsd: priced(harvest.args.loss, decimals, price.priceUsd),
    currentDebtUsd: priced(harvest.args.current_debt, decimals, price.priceUsd),
    protocolFeesUsd: priced(harvest.args.protocol_fees, decimals, price.priceUsd),
    totalFeesUsd: priced(harvest.args.total_fees, decimals, price.priceUsd),
    totalRefundsUsd: priced(harvest.args.total_refunds, decimals, price.priceUsd),
    priceUsd: price.priceUsd,
    priceSource: price.priceSource,
    apr
  }
}

async function fetchPreviousHarvest(harvest: Harvest) {
  const previousLog = await first<EvmLog>(EvmLogSchema, `
  SELECT * from evmlog 
  WHERE 
    chain_id = $1 
    AND address = $2 
    AND signature = $3 
    AND block_number < $4
    AND args->>'strategy' = $5
  ORDER BY block_number DESC, log_index DESC 
  LIMIT 1`,
  [harvest.chainId, harvest.address, topics[0], harvest.blockNumber, harvest.args.strategy])
  if (!previousLog) return undefined
  return HarvestSchema.parse(previousLog)
}

async function totalDebt(harvest: Harvest) {
  try {
    return await rpcs.next(harvest.chainId, harvest.blockNumber).readContract({
      address: harvest.args.strategy,
      functionName: 'totalDebt',
      abi: parseAbi(['function totalDebt() view returns (uint256)']),
      blockNumber: harvest.blockNumber
    }) as bigint
  } catch(error) {
    console.error('🤬', '!totalDebt')
    return 0n
  }
}

async function performanceFee(harvest: Harvest) {
  try {
    return await rpcs.next(harvest.chainId, harvest.blockNumber).readContract({
      address: harvest.args.strategy,
      functionName: 'performanceFee',
      abi: parseAbi(['function performanceFee() view returns (uint16)']),
      blockNumber: harvest.blockNumber
    }) as number
  } catch(error) {
    console.error('🤬', '!performanceFee')
    return 0
  }
}

export async function computeApr(latest: Harvest, previous: Harvest | undefined) {
  if(!previous) return { gross: 0, net: 0 }
  const latestDebt = await totalDebt(latest)
  const previousDebt = await totalDebt(previous)

  if(!(latestDebt && previousDebt)) return { gross: 0, net: 0 }

  const profit = latest.args.gain
  const loss = latest.args.loss
  const fees = BigInt(await performanceFee(latest))

  const grossPerformance = (loss > profit)
  ? math.div(-loss, previousDebt)
  : math.div(profit, previousDebt)

  const netPerformance = (loss > profit)
  ? math.div(-loss, previousDebt)
  : math.div(math.max(profit - fees, 0n), previousDebt)

  const periodInHours = Number(((latest.blockTime || 0n) - (previous.blockTime || 0n)) / (60n * 60n)) || 1
  const hoursInOneYear = 24 * 365
  const gross = grossPerformance * hoursInOneYear / periodInHours
  const net = netPerformance * hoursInOneYear / periodInHours

  return { gross, net }
}
