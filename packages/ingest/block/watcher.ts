import { PublicClient } from 'viem'
import { mq, types } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'

export default class BlockWatcher implements Processor {
  queue: Queue = mq.queue(mq.q.block.load)
  watchers: (() => void)[] = []

  async up() {
    const _rpcs = rpcs.nextAll()
    Object.values(_rpcs).forEach((rpc: PublicClient) => {
      this.watchers.push(rpc.watchBlocks({
        onBlock: async (block) => {
          console.log('👀', 'block', rpc.chain?.id, block.number)
          await this.queue.add(mq.job.__noname, {
            chainId: rpc.chain?.id,
            blockNumber: block.number.toString(),
            blockTimestamp: block.timestamp.toString(),
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
