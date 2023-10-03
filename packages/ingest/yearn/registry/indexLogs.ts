import { setTimeout } from 'timers/promises'
import { Queue } from 'bullmq'
import { contracts } from 'lib/contracts/yearn/registries'
import { mq } from 'lib'
import { getLatestBlock } from '../../db'

export async function indexLogs(queue: Queue, 
  options: { chainId: number, key: string, from?: bigint, to?: bigint }
  ) {

  const { chainId, key } = options
  const contract = contracts.at(chainId, key)
  const from = options.from || contract.incept
  const to = options.to || await getLatestBlock(chainId)
  const stride = 100_000n
  const throttle = 16

  console.log('🗂️ ', 'index', chainId, key, from, to)

  for (let block = from; block <= to; block += stride) {
    const toBlock = block + stride - 1n < to ? block + stride - 1n : to
    const options = { chainId, key, from: block.toString(), to: toBlock.toString() }
    await queue.add(mq.q.yearn.registry.extractJobs.logs, options)
    await setTimeout(throttle)
  }
}
