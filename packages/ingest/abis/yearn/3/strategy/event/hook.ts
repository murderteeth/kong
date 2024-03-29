import { z } from 'zod'
import { parseAbi, toEventSelector } from 'viem'
import { priced } from 'lib/math'
import { fetchOrExtractAsset, fetchOrExtractDecimals } from '../../../lib'
import { fetchErc20PriceUsd } from '../../../../../prices'
import { math, multicall3 } from 'lib'
import { rpcs } from '../../../../../rpcs'
import { first } from '../../../../../db'
import { EvmLog, EvmLogSchema, zhexstring } from 'lib/types'
import { getBlockTime } from 'lib/blocks'

export const topics = [
  `event Reported(uint256 profit, uint256 loss, uint256 protocolFees, uint256 performanceFees)`
].map(e => toEventSelector(e))

export const HarvestSchema = z.object({
  chainId: z.number(),
  address: zhexstring,
  blockNumber: z.bigint({ coerce: true }),
  blockTime: z.bigint({ coerce: true }),
  args: z.object({
    profit: z.bigint({ coerce: true }),
    loss: z.bigint({ coerce: true }),
    protocolFees: z.bigint({ coerce: true }),
    performanceFees: z.bigint({ coerce: true })
  })
})

export type Harvest = z.infer<typeof HarvestSchema>

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const harvest = HarvestSchema.parse({
    chainId, address, blockTime: await getBlockTime(chainId, data.blockNumber), ...data
  })

  const decimals = await fetchOrExtractDecimals(chainId, address)
  const asset = await fetchOrExtractAsset(chainId, address, 'strategy', 'asset')
  const price = await fetchErc20PriceUsd(chainId, asset, harvest.blockNumber)

  const previousLog = await first<EvmLog>(EvmLogSchema, `
  SELECT * from evmlog 
  WHERE chain_id = $1 AND address = $2 AND signature = $3 AND block_number < $4 
  ORDER BY block_number DESC, log_index DESC LIMIT 1`,
  [chainId, address, topics[0], harvest.blockNumber])
  const previousHarvest = previousLog ? HarvestSchema.parse(previousLog) : undefined
  const apr = multicall3.supportsBlock(chainId, data.blockNumber)
  ? await computeApr(harvest, previousHarvest)
  : { gross: 0, net: 0 }

  return {
    profitUsd: priced(harvest.args.profit, decimals, price.priceUsd),
    lossUsd: priced(harvest.args.loss, decimals, price.priceUsd),
    protocolFeesUsd: priced(harvest.args.protocolFees, decimals, price.priceUsd),
    performanceFeesUsd: priced(harvest.args.performanceFees, decimals, price.priceUsd),
    priceUsd: price.priceUsd,
    priceSource: price.priceSource,
    apr
  }
}

export async function totalDebt(harvest: Harvest) {
  try {
    return await rpcs.next(harvest.chainId, harvest.blockNumber).readContract({
      address: harvest.address,
      functionName: 'totalDebt',
      abi: parseAbi(['function totalDebt() view returns (uint256)']),
      blockNumber: harvest.blockNumber
    }) as bigint
  } catch(error) {
    return 0n
  }
}

export async function computeApr(latest: Harvest, previous: Harvest | undefined) {
  if(!previous) return { gross: 0, net: 0 }
  const latestDebt = await totalDebt(latest)
  const previousDebt = await totalDebt(previous)

  if(!(latestDebt && previousDebt)) return { gross: 0, net: 0 }

  const profit = latest.args.profit
  const loss = latest.args.loss
  const fees = latest.args.performanceFees ?? 0n

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
