import { z } from 'zod'
import { toEventSelector } from 'viem'
import { fetchOrExtractAsset, fetchOrExtractDecimals } from '../../../../lib'
import { fetchErc20PriceUsd } from '../../../../../../prices'
import { priced } from 'lib/math'

export const topics = [
  `event StrategyReported(address indexed strategy, uint256 gain, uint256 loss, uint256 debtPaid, uint256 totalGain, uint256 totalLoss, uint256 totalDebt, uint256 debtAdded, uint256 debtRatio)`
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const { blockNumber, args } = z.object({
    blockNumber: z.bigint({ coerce: true }),
    args: z.object({
      gain: z.bigint({ coerce: true }),
      loss: z.bigint({ coerce: true }),
      debtPaid: z.bigint({ coerce: true }),
      totalGain: z.bigint({ coerce: true }),
      totalLoss: z.bigint({ coerce: true }),
      totalDebt: z.bigint({ coerce: true }),
      debtAdded: z.bigint({ coerce: true })
    })
  }).parse(data)

  const decimals = await fetchOrExtractDecimals(chainId, address, )
  const asset = await fetchOrExtractAsset(chainId, address, 'vault', 'token')
  const price = await fetchErc20PriceUsd(chainId, asset, blockNumber)

  return {
    gainUsd: priced(args.gain, decimals, price.priceUsd),
    lossUsd: priced(args.loss, decimals, price.priceUsd),
    debtPaidUsd: priced(args.debtPaid, decimals, price.priceUsd),
    totalGainUsd: priced(args.totalGain, decimals, price.priceUsd),
    totalLossUsd: priced(args.totalLoss, decimals, price.priceUsd),
    totalDebtUsd: priced(args.totalDebt, decimals, price.priceUsd),
    debtAddedUsd: priced(args.debtAdded, decimals, price.priceUsd),
    ...price
  }
}
