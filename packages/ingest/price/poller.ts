import { mq, types } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { RpcClients, rpcs } from '../rpcs'
import { mainnet } from 'viem/chains'
import { parseAbi } from 'viem'

const oracle = '0x9b8b9F6146B29CC32208f42b995E70F0Eb2807F3' as `0x${string}`

const tokens = [
  {
    symbol: 'WETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`
  }
]

export default class BlockPoller implements Processor {
  private id = Math.random().toString(36).substring(7)
  private queue: Queue | undefined
  private rpcs: RpcClients = rpcs.next()
  private interval: NodeJS.Timeout | undefined

  async up() {
    this.queue = mq.queue(mq.q.price.load)
    this.interval = setInterval(async () => {
      const rpc = this.rpcs[mainnet.id]
      const weth = tokens[0]
      const block = await rpc.getBlock()
      console.log('💈', 'price', this.id, rpc.chain?.id, block.number)

      const priceUSDC = await rpc.readContract({
        address: oracle,
        functionName: '' as never,
        args: [ weth.address ],
        abi: parseAbi(['function getPriceUsdcRecommended(address tokenAddress) view returns (uint256)']),
        blockNumber: block.number
      }) as bigint

      const priceUsd = Number(priceUSDC * 10_000n / BigInt(10 ** 6)) / 10_000

      await this.queue?.add(mq.q.price.loadJobs.price, {
        chainId: rpc.chain?.id,
        address: weth.address,
        symbol: weth.symbol,
        priceUsd,
        asOfBlockNumber: block.number.toString(),
        asOfTime: block.timestamp.toString()
      } as types.Price, {
        jobId: `${rpc.chain?.id}-${weth}-${block.number}`,
      })
    }, 60_000)
  }

  async down() {
    clearInterval(this.interval)
    await this.queue?.close()
    this.queue = undefined
  }
}
