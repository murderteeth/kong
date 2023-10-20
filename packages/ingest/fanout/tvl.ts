import { Queue } from 'bullmq'
import db from '../db'
import { Processor } from 'lib/processor'
import { chains, dates, mq } from 'lib'
import { setTimeout } from 'timers/promises'

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
      const throttle = 16
      const periodMinutes = 24 * 60
      const period = periodMinutes * 60_000

      for(const tvlTime of await getLatestTvlTimes(chain.id)) {
        const { address, blockTimeMs } = tvlTime
        const start = roundToNearestMinutes(Math.max(blockTimeMs || 0, dates.DEFAULT_START_MS()), periodMinutes)
        const end = roundToNearestMinutes(new Date().getTime(), periodMinutes)
        for(let time = start; time < end; time += period) {
          await this.queue?.add(mq.job.compute.tvl, {
            chainId: chain.id, address, time: time / 1000
          })
        }
        await setTimeout(throttle)
      }
    }
  }
}

function roundToNearestMinutes(epochMs: number, interval: number): number {
  const date = new Date(epochMs)
  const minutes = date.getMinutes()
  const roundBy = Math.round(minutes / interval) * interval
  date.setMinutes(roundBy, 0, 0)
  return date.getTime()
}

export async function getLatestTvlTimes(chainId: number) {
  const result = await db.query(`
    SELECT 
      v.address,
      FLOOR(EXTRACT(EPOCH FROM MAX(tvl.block_time))) * 1000 as "blockTimeMs"
    FROM vault v
    LEFT OUTER JOIN tvl
    ON v.chain_id = tvl.chain_id AND v.address = tvl.address
    WHERE v.chain_id = $1
    GROUP BY v.address;
  `, [chainId])
  return result.rows as { 
    address: `0x${string}`, 
    blockTimeMs: number | null
  }[]
}
