import { mq, types } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { RpcClients, rpcs } from '../rpcs'
import config from '../config'

export default class BlockPoller implements Processor {
  private queue: Queue
  private rpcs: RpcClients
  private interval: NodeJS.Timeout | undefined

  constructor() {
    this.queue = mq.queue(mq.q.block.load)
    this.rpcs = rpcs.next()
  }

  async up() {
    this.interval = setInterval(async () => {
      for(const rpc of Object.values(this.rpcs)) {
        const block = await rpc.getBlock()
        console.log('💈', 'block', rpc.chain?.id, block.number)
        await this.queue.add(mq.q.block.loadJobs.block, {
          chainId: rpc.chain?.id,
          blockNumber: block.number.toString(),
          blockTimestamp: block.timestamp.toString(),
          queueTimestamp: (Math.round(Date.now() / 1000)).toString()
        } as types.LatestBlock, {
          jobId: `${rpc.chain?.id}-${block.number}`,
        })
      }
    }, config.pollMs)
  }

  async down() {
    if(this.interval) clearInterval(this.interval)
    await this.queue.close()
  }
}
