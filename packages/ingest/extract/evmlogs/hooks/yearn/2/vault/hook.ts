import { z } from 'zod'
import { Queue } from 'bullmq'
import { mq } from 'lib'
import { Log, parseAbi, toEventSelector } from 'viem'
import { estimateCreationBlock, getBlockTime } from 'lib/blocks'
import { EvmLog, ThingSchema, zhexstring } from 'lib/types'
import { Hook } from '../../../..'
import { rpcs } from 'lib/rpcs'
import { extractDecimals, fetchAsset, fetchOrExtractAsset, fetchOrExtractDecimals } from '../lib'
import { fetchErc20PriceUsd } from '../../../../../../prices'
import { priced } from 'lib/math'

export default class VaultHook implements Hook {
  queues: { [key: string]: Queue } = {}

  up = async () => {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  down = async () => {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  process = async (chainId: number, address: `0x${string}`, log: Log|EvmLog) => {
    if(!log.blockNumber) throw new Error('!log.blockNumber')
    const [logTopic] = log.topics

    const [strategyAddress, strategyMigrated, strategyRevoked, strategyReported, transfer] = parseAbi([
      `event StrategyAdded(address indexed strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)`,
      `event StrategyMigrated(address indexed oldVersion, address indexed newVersion)`,
      `event StrategyRevoked(address indexed strategy)`,
      `event StrategyReported(address indexed strategy, uint256 gain, uint256 loss, uint256 debtPaid, uint256 totalGain, uint256 totalLoss, uint256 totalDebt, uint256 debtAdded, uint256 debtRatio)`,
      `event Transfer(address indexed sender, address indexed receiver, uint256 value)`
    ])

    switch(logTopic) {
      case toEventSelector(strategyAddress): {
        const { strategy } = z.object({
          strategy: zhexstring,
        }).parse((log as any).args)
        await this.addStrategy(chainId, address, strategy)
        break
      }

      case toEventSelector(strategyMigrated): {
        const { newVersion } = z.object({
          newVersion: zhexstring,
        }).parse((log as any).args)
        await this.addStrategy(chainId, address, newVersion)
        break
      }

      case toEventSelector(strategyRevoked): {
        const { strategy } = z.object({
          strategy: zhexstring,
        }).parse((log as any).args)
        const revokedBlockNumber = log.blockNumber
        const revokedBlockTime = revokedBlockNumber ? await getBlockTime(chainId, revokedBlockNumber) : 0n
        await this.queues[mq.q.load].add(mq.job.load.thing, ThingSchema.parse({
          chainId,
          address: strategy,
          label: 'strategy',
          defaults: {
            revoked: true,
            revokedBlockNumber,
            revokedBlockTime
          }
        }))
        break
      }

      case toEventSelector(strategyReported): {
        const args = z.object({
          gain: z.bigint({ coerce: true }),
          loss: z.bigint({ coerce: true }),
          debtPaid: z.bigint({ coerce: true }),
          totalGain: z.bigint({ coerce: true }),
          totalLoss: z.bigint({ coerce: true }),
          totalDebt: z.bigint({ coerce: true }),
          debtAdded: z.bigint({ coerce: true })
        }).parse((log as any).args)

        const decimals = await fetchOrExtractDecimals(chainId, address, 'vault')
        const asset = await fetchOrExtractAsset(chainId, address, 'vault', 'token')
        const price = await fetchErc20PriceUsd(chainId, asset, log.blockNumber)

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

      case toEventSelector(transfer): {
        const args = z.object({
          value: z.bigint({ coerce: true })
        }).parse((log as any).args)
        const decimals = await fetchOrExtractDecimals(chainId, address, 'vault')
        const price = await fetchErc20PriceUsd(chainId, address, log.blockNumber)
        return {
          valueUsd: priced(args.value, decimals, price.priceUsd),
          ...price
        }
      }
    }
  }

  async addStrategy(chainId: number, vault: `0x${string}`, strategy: `0x${string}`) {
    const apiVersion = await rpcs.next(chainId).readContract({
      address: strategy,
      functionName: 'apiVersion',
      abi: parseAbi(['function apiVersion() view returns (string)'])
    })

    const asset = await fetchAsset(chainId, vault, 'vault')
    const decimals = await extractDecimals(chainId, vault)
    const block = await estimateCreationBlock(chainId, strategy)
    const inceptBlock = block.number
    const inceptTime = await getBlockTime(chainId, inceptBlock)
    await this.queues[mq.q.load].add(mq.job.load.thing, ThingSchema.parse({
      chainId,
      address: strategy,
      label: 'strategy',
      defaults: {
        vault,
        asset,
        decimals,
        apiVersion,
        inceptBlock,
        inceptTime
      }
    }))
  }
}
