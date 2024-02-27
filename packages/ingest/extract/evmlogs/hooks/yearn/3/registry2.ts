import { z } from 'zod'
import { Queue } from 'bullmq'
import { mq } from 'lib'
import { Log, parseAbi, toEventSelector } from 'viem'
import { rpcs } from 'lib/rpcs'
import { estimateHeight } from 'lib/blocks'
import { zhexstring } from 'lib/types'
import { Hook } from '../../..'

export default class RegistryHook implements Hook {
  queues: { [key: string]: Queue } = {}

  up = async () => {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  down = async () => {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  process = async (chainId: number, address: `0x${string}`, log: Log) => {
    const abi = parseAbi(['event NewEndorsedVault(address indexed vault, address indexed asset, uint256 releaseVersion, uint256 vaultType)'])
    const hookTopic = toEventSelector(abi[0])
    const logTopic = log.topics[0]
    if(logTopic === hookTopic) {
      const _log = log as Log<bigint, number, boolean, undefined, false, typeof abi>
      const { vault, vaultType } = z.object({
        vault: zhexstring.optional(),
        vaultType: z.bigint({ coerce: true }).optional()
      }).parse(_log.args)

      if(!(vault && vaultType)) return

      const label = vaultType === 1n ? 'vault': 'strategy'

      const multicall = await rpcs.next(chainId).multicall({ contracts: [
        {
          address,
          abi: parseAbi(['function vaultInfo(address) view returns (address, uint96, uint64, uint128, uint64, string)']),
          functionName: 'vaultInfo',
          args: [vault]
        },
        {
          address: vault,
          abi: parseAbi(['function apiVersion() view returns (string)']),
          functionName: 'apiVersion'
        }
      ]})

      if(multicall.some(r => r.error)) throw new Error(`multicall error, ${JSON.stringify(multicall)}`)

      const [vaultInfo, apiVersion] = multicall
      const inceptTime = vaultInfo!.result![3]
      const inceptBlock = await estimateHeight(chainId, inceptTime)
      const thing = {
        chainId,
        address: vault,
        label,
        defaults: {
          apiVersion: apiVersion!.result!,
          registry: address,
          inceptBlock,
          inceptTime
        }
      }

      await this.queues[mq.q.load].add(mq.job.load.thing, thing)
    }
  }
}
