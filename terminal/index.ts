import { createPublicClient, webSocket } from 'viem'
import dotenv from 'dotenv'
import { mainnet } from 'viem/chains'
import { mq } from 'lib'
import path from 'path'

const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })

async function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export async function indexLatestFactoryVault() {
  console.log('🗂️ ', 'index latest factory vault')
  const blockRange = { fromBlock: 17895499, toBlock: 17895499 }
  const queue = mq.queue(mq.q.registry.n)
  await queue.add(mq.q.registry.extract, blockRange)
  await queue.close()
}

export async function indexRegistry() {
  console.log('🗂️ ', 'index registry')
  const rpc = createPublicClient({
    chain: mainnet, transport: webSocket(process.env.WSS_NETWORK_1)
  })
  const queue = mq.queue(mq.q.registry.n)

  const inceptBlock = 16215519n
  const latestBlock = await rpc.getBlockNumber()
  const stride = 1000n
  console.log('blocks', latestBlock - inceptBlock, (latestBlock - inceptBlock) / stride)

  for (let block = inceptBlock; block <= latestBlock; block += stride) {
    const toBlock = block + stride - 1n < latestBlock ? block + stride - 1n : latestBlock
    const blockRange = { fromBlock: block.toString(), toBlock: toBlock.toString() }
    queue.add(mq.q.registry.extract, blockRange)
    console.log('📇 ', blockRange)
    await sleep(50)
  }

  await queue.close()
}

async function main() {
  // await indexLatestFactoryVault()
  await indexRegistry()
}

main()
