import { PublicClient } from 'viem'
import { mq, types } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from '../processor'
import { RpcClients, rpcs } from '../rpcs'

export class BlockWatcher implements Processor {
  queue: Queue
  rpcs: RpcClients
  watchers: (() => void)[] = []

  constructor() {
    this.queue = mq.queue(mq.q.block.n)
    this.rpcs = rpcs.next()
  }

  async up() {
    Object.values(this.rpcs).forEach((rpc: PublicClient) => {
      this.watchers.push(rpc.watchBlocks({
        onBlock: async (block) => {
          console.log('👀', mq.q.block.n, rpc.chain?.id, block.number)
          await this.queue.add(mq.q.block.load, {
            chainId: rpc.chain?.id,
            blockNumber: block.number.toString(),
            blockTimestamp: block.timestamp.toString(),
            queueTimestamp: (Math.round(Date.now() / 1000)).toString(),
          } as types.LatestBlock, {
            jobId: `${rpc.chain?.id}-${block.number}`,
          })
        }, onError: (error) => {
          console.error('🤬', mq.q.block.n, error)
        }
      }))
    })
  }

  async down() {
    this.watchers.forEach(unwatch => unwatch())
    await this.queue.close()
  }
}
