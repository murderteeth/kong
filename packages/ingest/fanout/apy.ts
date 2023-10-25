import { Queue } from 'bullmq'
import db from '../db'
import { Processor } from 'lib/processor'
import { chains, dates, mq } from 'lib'
import { setTimeout } from 'timers/promises'
import { endOfDayMs } from 'lib/dates'

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
      const throttle = 16
      const oneDayMs = 24 * 60 * 60 * 1000

      for(const { address, blockTimeMs } of await getLatestApyTimes(chain.id)) {
        const start = endOfDayMs(Math.max(blockTimeMs || 0, dates.DEFAULT_START_MS()))
        const end = endOfDayMs(new Date().getTime())
        for(let time = start; time <= end; time += oneDayMs) {
          await this.queue?.add(mq.job.compute.apy, {
            chainId: chain.id, address, time: time / 1000
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
      FLOOR(EXTRACT(EPOCH FROM MAX(apy.block_time))) * 1000 as "blockTimeMs"
    FROM vault v
    LEFT OUTER JOIN apy
    ON v.chain_id = apy.chain_id AND v.address = apy.address
    WHERE v.chain_id = $1
    GROUP BY v.address;
  `, [chainId])
  return result.rows as { 
    address: `0x${string}`, 
    blockTimeMs: number | null
  }[]
}
