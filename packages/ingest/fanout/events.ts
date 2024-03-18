import { setTimeout } from 'timers/promises'
import { mq, strider } from 'lib'
import { AbiConfig, AbiConfigSchema, SourceConfig, SourceConfigSchema } from 'lib/abis'
import { getBlockNumber } from 'lib/blocks'
import { getTravelledStrides } from '../db'
import { StrideSchema } from 'lib/types'

export default class EventsFanout {
  async fanout(data: { abi: AbiConfig, source: SourceConfig, replay?: boolean }) {
    const { chainId, address, inceptBlock, startBlock, endBlock } = SourceConfigSchema.parse(data.source)
    const { abiPath } = AbiConfigSchema.parse(data.abi)
    const { replay } = data

    const from = startBlock !== undefined ? startBlock : inceptBlock
    const to = endBlock !== undefined ? endBlock : await getBlockNumber(chainId)

    const replayRange = undefined // [{ from: 19309874n, to: 19309874n }]
    const travelled = replay ? undefined : await getTravelledStrides(chainId, address)
    const nextStrides = replayRange ? replayRange : strider.plan(from, to, travelled)

    for (const stride of StrideSchema.array().parse(nextStrides)) {
      console.log('📤', 'stride', chainId, address, stride.from, stride.to)
      await walklog(stride, async (from, to) => {
        await mq.add(mq.job.extract.evmlog, {
          abiPath, chainId, address, from, to, replay
        })
      })
    }
  }
}

async function walklog(
  o: { from: bigint, to: bigint, stride?: bigint, throttle?: number }, 
  f: (from: bigint, to: bigint) => Promise<void>
) {
  const stride = o.stride || BigInt(process.env.LOG_STRIDE || 10_000)
  for (let fromBlock = o.from; fromBlock <= o.to; fromBlock += stride) {
    const toBlock = fromBlock + stride - 1n < o.to ? fromBlock + stride - 1n : o.to
    await f(fromBlock, toBlock)
    await setTimeout(o.throttle || 16)
  }
}
