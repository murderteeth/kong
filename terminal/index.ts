import { createPublicClient, webSocket } from 'viem'
import dotenv from 'dotenv'
import { Chain, arbitrum, fantom, mainnet, optimism, polygon } from 'viem/chains'
import { mq } from 'lib'
import path from 'path'
import { contracts } from 'lib/contracts/yearn/registries'

const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })

async function sleep(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export async function indexRegistryRange(chain: Chain, key: string, fromBlock: bigint, toBlock: bigint) {
  console.log('🗂️ ', 'index registry', chain.id, key, fromBlock, toBlock)
  const options = { chainId: chain.id, key, fromBlock: fromBlock.toString(), toBlock: toBlock.toString() }
  const queue = mq.queue(mq.q.registry.n)
  await queue.add(mq.q.registry.extract, options)
  await queue.close()
}

export async function indexRegistry(chain: Chain, key: string, wss: string) {
  console.log('🗂️ ', 'index registry')
  const stride = 10_000n

  const rpc = createPublicClient({
    chain, transport: webSocket(wss)
  })
  const queue = mq.queue(mq.q.registry.n)

  const contract = contracts.at(chain.id, key)
  const incept = contract.incept
  const latest = await rpc.getBlockNumber()

  console.log('blocks', latest - incept, (latest - incept) / stride)

  for (let block = incept; block <= latest; block += stride) {
    const toBlock = block + stride - 1n < latest ? block + stride - 1n : latest
    const options = { chainId: chain.id, key, fromBlock: block.toString(), toBlock: toBlock.toString() }
    console.log('📇', options.chainId, options.key, options.fromBlock, options.toBlock)
    await queue.add(mq.q.registry.extract, options)
    await sleep(16)
  }

  await queue.close()
}

async function main() {
  // latest mainnet curve factory vault
  // await indexRegistryRange(mainnet, 'registry-2', 17895499n, 17895499n)

  // await indexRegistry(mainnet, 'registry-0', process.env.WSS_NETWORK_1 as string)
  // await indexRegistry(mainnet, 'registry-1', process.env.WSS_NETWORK_1 as string)
  await indexRegistry(mainnet, 'registry-2', process.env.WSS_NETWORK_1 as string)
  // await indexRegistry(optimism, 'registry-0', process.env.WSS_NETWORK_10 as string)
  // await indexRegistry(polygon, 'registry-0', process.env.WSS_NETWORK_137 as string)
  // await indexRegistry(fantom, 'registry-0', process.env.WSS_NETWORK_250 as string)
  // await indexRegistry(arbitrum, 'registry-0', process.env.WSS_NETWORK_42161 as string)
}

main()
