import { z } from 'zod'
import { Queue } from 'bullmq'
import { Log, parseAbi, toEventSelector } from 'viem'
import { Hook } from '../../../..'
import { fetchErc20PriceUsd } from 'lib/prices'
import { priced } from 'lib/math'
import { fetchOrExtractAsset, fetchOrExtractDecimals } from '../lib'

export default class StrategyHook implements Hook {
  queues: { [key: string]: Queue } = {}
  up = async () => {}
  down = async () => {}
  process = async (chainId: number, address: `0x${string}`, log: Log) => {
    if(!log.blockNumber) throw new Error('!log.blockNumber')

    const [logTopic] = log.topics
    const [harvested] = parseAbi([
      `event Harvested(uint256 profit, uint256 loss, uint256 debtPayment, uint256 debtOutstanding)`
    ])

    switch(logTopic) {
      case toEventSelector(harvested): {
        const args = z.object({
          profit: z.bigint({ coerce: true }),
          loss: z.bigint({ coerce: true }),
          debtPayment: z.bigint({ coerce: true }),
          debtOutstanding: z.bigint({ coerce: true })
        }).parse((log as any).args)

        const decimals = await fetchOrExtractDecimals(chainId, address, 'strategy')
        const asset = await fetchOrExtractAsset(chainId, address, 'strategy', 'want')
        const price = await fetchErc20PriceUsd(chainId, asset, log.blockNumber)

        return {
          profitUsd: priced(args.profit, decimals, price.priceUsd),
          lossUsd: priced(args.loss, decimals, price.priceUsd),
          debtPaymentUsd: priced(args.debtPayment, decimals, price.priceUsd),
          debtOutstandingUsd: priced(args.debtOutstanding, decimals, price.priceUsd),
          ...price
        }
      }
    }
  }
}
