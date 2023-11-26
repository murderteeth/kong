import { Queue } from 'bullmq'
import { chains, mq, types } from 'lib'
import { Processor } from 'lib/processor'
import { latestBlocks, rpcs } from '../rpcs'

export class BlockExtractor implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
  }

  async down() {
    await this.queue?.close()
  }

  async extract() {
    for(const chain of chains) {
      const rpc = rpcs.next(chain.id)
      const block = await rpc.getBlock()

      latestBlocks[rpc.chain?.id as number] = {
        blockNumber: block.number,
        blockTime: block.timestamp
      }

      await this.queue?.add(mq.job.load.block, {
        chainId: rpc.chain?.id,
        blockNumber: block.number,
        blockTime: block.timestamp
      } as types.LatestBlock, {
        jobId: `${rpc.chain?.id}-${block.number}`
      })
    }
  }
}
