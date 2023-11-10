import { Queue } from 'bullmq'
import db from '../db'
import { Processor } from 'lib/processor'
import { chains, dates, math, mq } from 'lib'
import { setTimeout } from 'timers/promises'
import { endOfDay, endOfDayMs } from 'lib/dates'

export default class ApyFanout implements Processor {
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

      for(const { address, activation, blockTime } of await getLatestApyTimes(chain.id)) {
        const start = endOfDay(math.max(blockTime || 0n, activation, dates.DEFAULT_START()))
        const end = endOfDay(BigInt(Math.floor(new Date().getTime() / 1000)))
        for(let time = start; time <= end; time += oneDay) {
          await this.queue?.add(mq.job.compute.apy, {
            chainId: chain.id, address, time
          })
        }
        await setTimeout(throttle)
      }
    }
  }
}

export async function getLatestApyTimes(chainId: number) {
  const result = await db.query(`
    SELECT 
      v.address,
      FLOOR(EXTRACT(EPOCH FROM MAX(v.activation_block_time))) as "activation",
      FLOOR(EXTRACT(EPOCH FROM MAX(apy.block_time))) as "blockTime"
    FROM vault v
    LEFT OUTER JOIN apy
    ON v.chain_id = apy.chain_id AND v.address = apy.address
    WHERE v.chain_id = $1
    GROUP BY v.address, v.activation_block_time;
  `, [chainId])
  return result.rows as { 
    address: `0x${string}`, 
    activation: bigint,
    blockTime: bigint | null
  }[]
}
