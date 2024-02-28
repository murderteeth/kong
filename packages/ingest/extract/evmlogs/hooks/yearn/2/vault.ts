import { z } from 'zod'
import { Queue } from 'bullmq'
import { mq } from 'lib'
import { Log, parseAbi, toEventSelector } from 'viem'
import { estimateCreationBlock, getBlock, getBlockTime } from 'lib/blocks'
import { ThingSchema, zhexstring } from 'lib/types'
import { Hook } from '../../..'
import { rpcs } from 'lib/rpcs'

export default class VaultHook implements Hook {
  queues: { [key: string]: Queue } = {}

  up = async () => {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  down = async () => {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  process = async (chainId: number, address: `0x${string}`, log: Log) => {
    const [logTopic] = log.topics

    const [strategyAddress, strategyMigrated, strategyRevoked] = parseAbi([
      'event StrategyAdded(address indexed strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)',
      'event StrategyMigrated(address indexed oldVersion, address indexed newVersion)',
      'event StrategyRevoked(address indexed strategy)',
    ])

    switch(logTopic) {
      case toEventSelector(strategyAddress): {
        const { strategy } = z.object({
          strategy: zhexstring,
        }).parse((log as any).args)
        await this.addStrategy(chainId, strategy)
        break
      }

      case toEventSelector(strategyMigrated): {
        const { newVersion } = z.object({
          newVersion: zhexstring,
        }).parse((log as any).args)
        await this.addStrategy(chainId, newVersion)
        break
      }

      case toEventSelector(strategyRevoked): {
        const { strategy } = z.object({
          strategy: zhexstring,
        }).parse((log as any).args)
        const revokedBlockNumber = log.blockNumber || 0n
        const revokedBlockTime = revokedBlockNumber ? await getBlockTime(chainId, revokedBlockNumber) : 0n
        const thing = ThingSchema.parse({
          chainId,
          address: strategy,
          label: 'strategy',
          defaults: {
            revoked: true,
            revokedBlockNumber,
            revokedBlockTime
          }
        })
        await this.queues[mq.q.load].add(mq.job.load.thing, thing)
      }
    }
  }

  async addStrategy(chainId: number, strategy: `0x${string}`) {
    const multicall = await rpcs.next(chainId).multicall({ contracts: [
      {
        address: strategy,
        abi: ['function apiVersion() view returns (string)'],
        functionName: 'apiVersion'
      },
      {
        address: strategy,
        abi: ['function api_version() view returns (string)'],
        functionName: 'api_version'
      }
    ]})
  
    const apiVersion = multicall[0].result || multicall[1].result
  
    const block = await estimateCreationBlock(chainId, strategy)
    const inceptBlock = block.number
    const inceptTime = await getBlockTime(chainId, inceptBlock)
    const thing = ThingSchema.parse({
      chainId,
      address: strategy,
      label: 'strategy',
      defaults: {
        apiVersion,
        inceptBlock,
        inceptTime
      }
    })
  
    await this.queues[mq.q.load].add(mq.job.load.thing, thing)
  }
}
