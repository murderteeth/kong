import { z } from 'zod'
import { toEventSelector } from 'viem'
import { fetchOrExtractAssetAddress, fetchOrExtractDecimals } from '../../../../lib'
import { fetchErc20PriceUsd } from '../../../../../../prices'
import { priced } from 'lib/math'
import { zhexstring } from 'lib/types'
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
  const asset = await fetchOrExtractAssetAddress(chainId, address, 'vault', 'token')
  const price = await fetchErc20PriceUsd(chainId, asset, harvest.blockNumber)

  return {
    gainUsd: priced(harvest.args.gain, decimals, price.priceUsd),
    lossUsd: priced(harvest.args.loss, decimals, price.priceUsd),
    debtPaidUsd: priced(harvest.args.debtPaid, decimals, price.priceUsd),
    totalGainUsd: priced(harvest.args.totalGain, decimals, price.priceUsd),
    totalLossUsd: priced(harvest.args.totalLoss, decimals, price.priceUsd),
    totalDebtUsd: priced(harvest.args.totalDebt, decimals, price.priceUsd),
    debtAddedUsd: priced(harvest.args.debtAdded, decimals, price.priceUsd),
    priceUsd: price.priceUsd,
    priceSource: price.priceSource
  }
}
