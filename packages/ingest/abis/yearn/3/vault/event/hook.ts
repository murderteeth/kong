import { z } from 'zod'
import { toEventSelector } from 'viem'
import { priced } from 'lib/math'
import { fetchOrExtractAssetAddress, fetchOrExtractDecimals } from '../../../lib'
import { fetchErc20PriceUsd } from '../../../../../prices'

export const topics = [
  `event StrategyReported(address indexed strategy, uint256 gain, uint256 loss, uint256 current_debt, uint256 protocol_fees, uint256 total_fees, uint256 total_refunds)`
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const { blockNumber, args } = z.object({
    blockNumber: z.bigint({ coerce: true }),
    args: z.object({
      gain: z.bigint({ coerce: true }),
      loss: z.bigint({ coerce: true }),
      current_debt: z.bigint({ coerce: true }),
      protocol_fees: z.bigint({ coerce: true }),
      total_fees: z.bigint({ coerce: true }),
      total_refunds: z.bigint({ coerce: true })
    })
  }).parse(data)

  const decimals = await fetchOrExtractDecimals(chainId, address)
  const asset = await fetchOrExtractAssetAddress(chainId, address, 'vault', 'asset')
  const price = await fetchErc20PriceUsd(chainId, asset, blockNumber)

  return {
    gainUsd: priced(args.gain, decimals, price.priceUsd),
    lossUsd: priced(args.loss, decimals, price.priceUsd),
    currentDebtUsd: priced(args.current_debt, decimals, price.priceUsd),
    protocolFeesUsd: priced(args.protocol_fees, decimals, price.priceUsd),
    totalFeesUsd: priced(args.total_fees, decimals, price.priceUsd),
    totalRefundsUsd: priced(args.total_refunds, decimals, price.priceUsd),
    priceUsd: price.priceUsd,
    priceSource: price.priceSource
  }
}
