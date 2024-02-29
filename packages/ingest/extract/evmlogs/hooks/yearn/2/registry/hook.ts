import { z } from 'zod'
import { Queue } from 'bullmq'
import { mq } from 'lib'
import { Log, parseAbi, toEventSelector } from 'viem'
import { estimateCreationBlock, getBlockTime } from 'lib/blocks'
import { ThingSchema, zhexstring } from 'lib/types'
import { Hook } from '../../../..'
import { rpcs } from 'lib/rpcs'
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
      `event NewVault(address indexed token, uint256 indexed deployment_id, address vault, string api_version)`,
      `event NewExperimentalVault(address indexed token, address indexed deployer, address vault, string api_version)`
    ])
    const logTopic = log.topics[0]
    if(logTopic === toEventSelector(abi[0]) || logTopic === toEventSelector(abi[1])) {
      const _log = log as Log<bigint, number, boolean, undefined, false, typeof abi>
      const { vault, token, api_version } = z.object({
        vault: zhexstring,
        token: zhexstring,
        api_version: z.string()
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
          apiVersion: api_version,
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
