import { mq, types } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'

export default class Poll implements Processor {
  worker: Worker | undefined
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
    this.worker = mq.worker(mq.q.poll, async job => {
      if(job.name === mq.job.poll.block) {
        const _rpcs = rpcs.nextAll()
        for(const rpc of Object.values(_rpcs)) {
          const block = await rpc.getBlock()
          console.log('💈', 'block', rpc.chain?.id, block.number)
          await this.queue?.add(mq.job.load.block, {
            chainId: rpc.chain?.id,
            blockNumber: block.number.toString(),
            blockTimestamp: block.timestamp.toString()
          } as types.LatestBlock, {
            jobId: `${rpc.chain?.id}-${block.number}`,
          })
        }

      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.queue?.close()
  }
}
