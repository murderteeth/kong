import { z } from 'zod'
import { Queue } from 'bullmq'
import { mq } from 'lib'
import { Log, parseAbi, toEventSelector } from 'viem'
import { estimateCreationBlock, getBlock, getBlockTime } from 'lib/blocks'
import { ThingSchema, zhexstring } from 'lib/types'
import { Hook } from '../../../..'
import { extractDecimals } from '../lib'

export default class RegistryHook implements Hook {
  queues: { [key: string]: Queue } = {}

  up = async () => {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  down = async () => {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  process = async (chainId: number, address: `0x${string}`, log: Log) => {
    const abi = parseAbi([
      `event NewVault(address indexed token, uint256 indexed vaultId, uint256 vaultType, address vault, string apiVersion)`
    ])
    const logTopic = log.topics[0]
    if(logTopic === toEventSelector(abi[0])) {
      const _log = log as Log<bigint, number, boolean, undefined, false, typeof abi>
      const { vault, token, apiVersion } = z.object({
        vault: zhexstring,
        token: zhexstring,
        apiVersion: z.string()
      }).parse(_log.args)

      const decimals = await extractDecimals(chainId, token)
      const block = await estimateCreationBlock(chainId, vault)
      const inceptBlock = block.number
      const inceptTime = await getBlockTime(chainId, inceptBlock)
      await this.queues[mq.q.load].add(mq.job.load.thing, ThingSchema.parse({
        chainId,
        address: vault,
        label: 'vault',
        defaults: {
          apiVersion,
          registry: address,
          asset: token,
          decimals,
          inceptBlock,
          inceptTime
        }
      }))
    }
  }
}
