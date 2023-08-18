import { PublicClient, createPublicClient, webSocket } from 'viem'
import { mainnet } from 'viem/chains'
import { mq, types } from 'lib'
import { Queue } from 'bullmq'

export class BlockWatcher implements types.Processor {
  queue: Queue
  rpc: PublicClient
  unwatch: (() => void) | undefined

  constructor() {
    this.queue = mq.queue(mq.n.load.block)
    this.rpc = createPublicClient({
      chain: mainnet, transport: webSocket(process.env.WSS_NETWORK_1)
    })
  }

  async up() {
    this.unwatch = this.rpc.watchBlocks({
      onBlock: async (block) => {
        console.log('👀', mq.n.load.block, this.rpc.chain?.id, block.number)
        await this.queue.add(mq.n.load.block, {
          networkId: this.rpc.chain?.id,
          blockNumber: block.number.toString(),
          blockTimestamp: block.timestamp.toString(),
          queueTimestamp: (Math.round(Date.now() / 1000)).toString(),
        } as types.LatestBlock)
      }, onError: (error) => {
        console.error('🤬', error)
      }
    })
  }

  async down() {
    if(this.unwatch) this.unwatch()
    await this.queue.close()
  }
}
