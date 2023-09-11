import { mq, types } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { RpcClients, rpcs } from '../rpcs'
import { mainnet } from 'viem/chains'
import { fetchErc20PriceUsd } from 'lib/prices'

const tokens = [
  {
    symbol: 'WETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`
  }
]

export default class BlockPoller implements Processor {
  private queue: Queue | undefined
  private worker: Worker | undefined
  private rpcs: RpcClients = rpcs.next()

  async up() {
    this.queue = mq.queue(mq.q.price.load)
    this.worker = mq.worker(mq.q.price.poll, async job => {
      const rpc = this.rpcs[mainnet.id]
      const weth = tokens[0]
      const block = await rpc.getBlock()
      console.log('💈', 'price', rpc.chain?.id, block.number)

      const priceUsd = await fetchErc20PriceUsd(rpc, weth.address, block.number)

      await this.queue?.add(mq.q.noJobName, {
        chainId: rpc.chain?.id,
        address: weth.address,
        symbol: weth.symbol,
        priceUsd,
        asOfBlockNumber: block.number.toString(),
        asOfTime: block.timestamp.toString()
      } as types.Price, {
        jobId: `${rpc.chain?.id}-${weth}-${block.number}`,
      })
    })
  }

  async down() {
    await this.worker?.close()
    await this.queue?.close()
    this.queue = undefined
  }
}
