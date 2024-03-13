import { setTimeout } from 'timers/promises'
import { math, mq, multicall3, strider } from 'lib'
import { Contract, ContractSchema, SourceConfig, SourceConfigSchema } from 'lib/contracts'
import { getBlockNumber, getDefaultStartBlockNumber } from 'lib/blocks'
import { getTravelledStrides } from '../db'
import { StrideSchema } from 'lib/types'

export default class EventsFanout {
  async fanout(data: { contract: Contract, source: SourceConfig, replay?: boolean }) {
    const { chainId, address, inceptBlock, startBlock, endBlock } = SourceConfigSchema.parse(data.source)
    const { abiPath, fromIncept } = ContractSchema.parse(data.contract)
    const { replay } = data

    const multicall3Activation = multicall3.getActivation(chainId)
    const defaultStartBlockNumber = await getDefaultStartBlockNumber(chainId)
    const from = startBlock !== undefined
    ? startBlock 
    : fromIncept
      ? inceptBlock 
      : math.max(inceptBlock, defaultStartBlockNumber, multicall3Activation)
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
