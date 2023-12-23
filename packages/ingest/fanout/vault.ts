import { setTimeout } from 'timers/promises'
import { chains, dates, mq } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { getLatestBlock, getVaultBlockPointers, setBlockPointer } from '../db'
import { parseAbi, parseAbiItem } from 'viem'
import { max } from 'lib/math'
import { estimateHeight } from 'lib/blocks'

export default class VaultFanout implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async fanout() {
    for(const chain of chains) {
      const default_start_block = await estimateHeight(chain.id, dates.DEFAULT_START())
      const pointers = await getVaultBlockPointers(chain.id)
      for(const pointer of pointers) {
        const from = max(pointer.blockNumber, pointer.activationBlockNumber, default_start_block)
        const to = await getLatestBlock(chain.id)

        await this.queues[mq.q.extract].add(mq.job.extract.vault, {
          chainId: chain.id,
          address: pointer.address
        })

        await this.fanoutExtract(
        chain.id,
        pointer.address,
        parseAbi([
          `event StrategyReported(address indexed strategy, uint256 gain, uint256 loss, uint256 debtPaid, uint256 totalGain, uint256 totalLoss, uint256 totalDebt, uint256 debtAdded, uint256 debtRatio)`,
          `event Transfer(address indexed sender, address indexed receiver, uint256 value)`,
          `event Reported(uint256 profit, uint256 loss, uint256 protocolFees, uint256 performanceFees)`
        ]),
        from, to)

        await setBlockPointer(chain.id, pointer.address, to)       
      }
    }
  }

  async fanoutExtract(chainId: number, address: string, events: any, from: bigint, to: bigint) {
    console.log('📤', 'fanout', chainId, address, from, to)
    const stride = BigInt(process.env.LOG_STRIDE || 10_000)
    const throttle = 16
    for (let block = from; block <= to; block += stride) {
      const toBlock = block + stride - 1n < to ? block + stride - 1n : to
      const options = {
        chainId, address,
        events: JSON.stringify(events),
        from: block, to: toBlock,
        handler: 'vault'
      }
      await this.queues[mq.q.extract].add(mq.job.extract.evmlogs, options)
      await setTimeout(throttle)
    }
  }
}
