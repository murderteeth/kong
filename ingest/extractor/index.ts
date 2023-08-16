import { Queue } from 'bullmq'
import { createPublicClient, webSocket } from 'viem'
import { mainnet } from 'viem/chains'
import dotenv from 'dotenv'
dotenv.config()

;(BigInt as any).prototype["toJSON"] = function () {
  return this.toString()
}

const bull = { connection: {
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT || 6379) as number,
}}

const blockQueue = new Queue('block', bull)

const rpc = createPublicClient({
  chain: mainnet, transport: webSocket(process.env.WSS_NETWORK_1)
})

rpc.watchBlocks({
  onBlock: async (block) => {
    console.log('👀 block', block.number, block.timestamp)
    await blockQueue.add('block', {
      network_id: rpc.chain.id,
      block_number: block.number,
      block_timestamp: block.timestamp,
      queue_timestamp: (Math.round(Date.now() / 1000)).toString(),
    })
  }
})

console.log('🦍 extractor up')

function shutdown() {
  blockQueue.close().then(() => {
    console.log('🦍 extractor down')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)