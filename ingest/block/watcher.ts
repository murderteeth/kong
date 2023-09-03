import { PublicClient } from 'viem'
import { mq, types } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { RpcClients, rpcs } from '../rpcs'

export default class BlockWatcher implements Processor {
  queue: Queue
  rpcs: RpcClients
  watchers: (() => void)[] = []

  constructor() {
    this.queue = mq.queue(mq.q.block.load)
    this.rpcs = rpcs.next()
  }

  async up() {
    Object.values(this.rpcs).forEach((rpc: PublicClient) => {
      this.watchers.push(rpc.watchBlocks({
        onBlock: async (block) => {
          console.log('👀', 'block', rpc.chain?.id, block.number)
          await this.queue.add(mq.q.block.loadJobs.block, {
            chainId: rpc.chain?.id,
            blockNumber: block.number.toString(),
            blockTimestamp: block.timestamp.toString(),
            queueTimestamp: (Math.round(Date.now() / 1000)).toString(),
          } as types.LatestBlock, {
            jobId: `${rpc.chain?.id}-${block.number}`,
          })
        }, onError: (error) => {
          console.error('🤬', 'block watcher', error)
        }
      }))
    })
  }

  async down() {
    this.watchers.forEach(unwatch => unwatch())
    await this.queue.close()
  }
}
