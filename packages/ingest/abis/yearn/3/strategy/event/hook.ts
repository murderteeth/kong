import { z } from 'zod'
import { toEventSelector } from 'viem'
import { priced } from 'lib/math'
import { fetchOrExtractAsset, fetchOrExtractDecimals } from '../../../lib'
import { fetchErc20PriceUsd } from '../../../../../prices'

export const topics = [
  `event Reported(uint256 profit, uint256 loss, uint256 protocolFees, uint256 performanceFees)`
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const { blockNumber, args } = z.object({
    blockNumber: z.bigint({ coerce: true }),
    args: z.object({
      profit: z.bigint({ coerce: true }),
      loss: z.bigint({ coerce: true }),
      protocolFees: z.bigint({ coerce: true }),
      performanceFees: z.bigint({ coerce: true })
    })
  }).parse(data)

  const decimals = await fetchOrExtractDecimals(chainId, address)
  const asset = await fetchOrExtractAsset(chainId, address, 'strategy', 'asset')
  const price = await fetchErc20PriceUsd(chainId, asset, blockNumber)

  return {
    gainUsd: priced(args.profit, decimals, price.priceUsd),
    lossUsd: priced(args.loss, decimals, price.priceUsd),
    currentDebtUsd: priced(args.protocolFees, decimals, price.priceUsd),
    protocolFeesUsd: priced(args.performanceFees, decimals, price.priceUsd),
    priceUsd: price.priceUsd,
    priceSource: price.priceSource
  }
}
