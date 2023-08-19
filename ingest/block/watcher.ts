import { PublicClient } from 'viem'
import { mainnet } from 'viem/chains'
import { mq, types } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from '../processor'
import { rpcs } from '../rpcs'

export class BlockWatcher implements Processor {
  queue: Queue
  rpc: PublicClient
  unwatch: (() => void) | undefined

  constructor() {
    this.queue = mq.queue(mq.q.block.n)
    this.rpc = rpcs.next(mainnet.id)
  }

  async up() {
    this.unwatch = this.rpc.watchBlocks({
      onBlock: async (block) => {
        console.log('👀', mq.q.block.n, this.rpc.chain?.id, block.number)
        await this.queue.add(mq.q.block.load, {
          networkId: this.rpc.chain?.id,
          blockNumber: block.number.toString(),
          blockTimestamp: block.timestamp.toString(),
          queueTimestamp: (Math.round(Date.now() / 1000)).toString(),
        } as types.LatestBlock, {
          jobId: `${this.rpc.chain?.id}-${block.number}`,
        })
      }, onError: (error) => {
        console.error('🤬', mq.q.block.n, error)
      }
    })
  }

  async down() {
    if(this.unwatch) this.unwatch()
    await this.queue.close()
  }
}
