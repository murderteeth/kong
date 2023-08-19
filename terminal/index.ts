import { createPublicClient, webSocket } from 'viem'
import dotenv from 'dotenv'
import { mainnet } from 'viem/chains'
import { mq } from 'lib'
import path from 'path'
import { contracts } from 'lib/contracts/yearn/registries'

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

  const key = 'yearn-registry-2'
  const stride = 1000n
  const incept = contracts[key].incept
  const latest = await rpc.getBlockNumber()

  console.log('blocks', latest - incept, (latest - incept) / stride)

  for (let block = incept; block <= latest; block += stride) {
    const toBlock = block + stride - 1n < latest ? block + stride - 1n : latest
    const options = { key, fromBlock: block.toString(), toBlock: toBlock.toString() }
    console.log('📇 ', options)
    await queue.add(mq.q.registry.extract, options)
    await sleep(16)
  }

  await queue.close()
}

async function main() {
  // await indexLatestFactoryVault()
  await indexRegistry()
}

main()
