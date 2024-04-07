import { z } from 'zod'
import { toEventSelector } from 'viem'
import { fetchErc20PriceUsd } from '../../../../../prices'
import { priced } from 'lib/math'
import { fetchOrExtractAssetAddress, fetchOrExtractDecimals } from '../../../lib'

export const topics = [
  `event Harvested(uint256 profit, uint256 loss, uint256 debtPayment, uint256 debtOutstanding)`
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const { blockNumber, args } = z.object({
    blockNumber: z.bigint({ coerce: true }),
    args: z.object({
      profit: z.bigint({ coerce: true }),
      loss: z.bigint({ coerce: true }),
      debtPayment: z.bigint({ coerce: true }),
      debtOutstanding: z.bigint({ coerce: true })
    })
  }).parse(data)

  const decimals = await fetchOrExtractDecimals(chainId, address)
  const asset = await fetchOrExtractAssetAddress(chainId, address, 'strategy', 'want')
  const price = await fetchErc20PriceUsd(chainId, asset, blockNumber)

  return {
    profitUsd: priced(args.profit, decimals, price.priceUsd),
    lossUsd: priced(args.loss, decimals, price.priceUsd),
    debtPaymentUsd: priced(args.debtPayment, decimals, price.priceUsd),
    debtOutstandingUsd: priced(args.debtOutstanding, decimals, price.priceUsd),
    priceUsd: price.priceUsd,
    priceSource: price.priceSource
  }
}
