import { Queue } from 'bullmq'
import { createPublicClient, webSocket } from 'viem'
import { mainnet } from 'viem/chains'
import dotenv from 'dotenv'
import { LatestBlock } from './lib'
dotenv.config()

const bull = { connection: {
  host: process.env.REDIS_HOST || 'localhost',
  port: (process.env.REDIS_PORT || 6379) as number,
}}

const blockQueue = new Queue('block', bull)

const rpc = createPublicClient({
  chain: mainnet, transport: webSocket(process.env.WSS_NETWORK_1)
})

// many watchers
// using message keys for auto-deduplication
const unwatchBlocks = rpc.watchBlocks({
  onBlock: async (block) => {
    console.log('👀 block', block.number, block.timestamp)
    await blockQueue.add('block', {
      networkId: rpc.chain.id,
      blockNumber: block.number.toString(),
      blockTimestamp: block.timestamp.toString(),
      queueTimestamp: (Math.round(Date.now() / 1000)).toString(),
    } as LatestBlock)
  }, onError: (error) => {
    console.error('🛑', error)
    throw error
  }
})

console.log('🦍 extractor up')

function shutdown() {
  unwatchBlocks()
  blockQueue.close().then(() => {
    console.log('🦍 extractor down')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)