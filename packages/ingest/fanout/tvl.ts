import { Queue } from 'bullmq'
import db from '../db'
import { Processor } from 'lib/processor'
import { chains, dates, math, mq } from 'lib'
import { setTimeout } from 'timers/promises'
import { endOfDay } from 'lib/dates'

export default class TvlFanout implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.compute)
  }

  async down() {
    await this.queue?.close()
  }

  async fanout() {
    for(const chain of chains) {
      const throttle = 8
      const oneDay = BigInt(24 * 60 * 60)

      for(const { address, activation, blockTime } of await getLatestTvlTimes(chain.id)) {
        const start = endOfDay(math.max(blockTime || 0n, activation, dates.DEFAULT_START()))
        const end = endOfDay(BigInt(Math.floor(new Date().getTime() / 1000)))
        for(let time = start; time <= end; time += oneDay) {
          await this.queue?.add(mq.job.compute.tvl, {
            chainId: chain.id, address, time
          })
        }
        await setTimeout(throttle)
      }
    }
  }
}

async function getLatestTvlTimes(chainId: number) {
  const result = await db.query(`
    SELECT 
      v.address,
      FLOOR(EXTRACT(EPOCH FROM MAX(v.activation_block_time))) as "activation",
      FLOOR(EXTRACT(EPOCH FROM MAX(tvl.block_time))) as "blockTime"
    FROM vault v
    LEFT OUTER JOIN tvl
    ON v.chain_id = tvl.chain_id AND v.address = tvl.address
    WHERE v.chain_id = $1
    GROUP BY v.address, v.activation_block_time;
  `, [chainId])
  return result.rows as { 
    address: `0x${string}`, 
    activation: bigint,
    blockTime: bigint | null
  }[]
}
