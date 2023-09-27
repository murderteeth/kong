import { mq, types } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'

export default class BlockPoller implements Processor {
  private queue: Queue | undefined
  private worker: Worker | undefined

  async up() {
    this.queue = mq.queue(mq.q.block.load)
    this.worker = mq.worker(mq.q.block.poll, async () => {
      const _rpcs = rpcs.nextAll()
      for(const rpc of Object.values(_rpcs)) {
        const block = await rpc.getBlock()
        console.log('💈', 'block', rpc.chain?.id, block.number)
        await this.queue?.add(mq.q.__noJobName, {
          chainId: rpc.chain?.id,
          blockNumber: block.number.toString(),
          blockTimestamp: block.timestamp.toString()
        } as types.LatestBlock, {
          jobId: `${rpc.chain?.id}-${block.number}`,
        })
      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.queue?.close()
    this.queue = undefined
  }
}
