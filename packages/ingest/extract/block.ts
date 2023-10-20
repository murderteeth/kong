import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'

export class BlockExtractor implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
  }

  async down() {
    await this.queue?.close()
  }

  async extract() {
    const _rpcs = rpcs.nextAll()
    for(const rpc of Object.values(_rpcs)) {
      const block = await rpc.getBlock()
      await this.queue?.add(mq.job.load.block, {
        chainId: rpc.chain?.id,
        blockNumber: block.number.toString(),
        blockTime: block.timestamp.toString()
      } as types.LatestBlock, {
        jobId: `${rpc.chain?.id}-${block.number}`,
      })
    }
  }
}
