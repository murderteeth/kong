import { mq, types } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { RpcClients, rpcs } from '../rpcs'

export default class BlockPoller implements Processor {
  private queue: Queue | undefined
  private worker: Worker | undefined
  private rpcs: RpcClients = rpcs.next()

  async up() {
    this.queue = mq.queue(mq.q.block.load)
    this.worker = mq.worker(mq.q.block.poll, async job => {
      for(const rpc of Object.values(this.rpcs)) {
        const block = await rpc.getBlock()
        console.log('💈', 'block', rpc.chain?.id, block.number)
        await this.queue?.add(mq.q.noJobName, {
          chainId: rpc.chain?.id,
          blockNumber: block.number.toString(),
          blockTimestamp: block.timestamp.toString(),
          queueTimestamp: (Math.round(Date.now() / 1000)).toString()
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
