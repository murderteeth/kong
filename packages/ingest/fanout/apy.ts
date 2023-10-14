import { Queue } from 'bullmq'
import db from '../db'
import { Processor } from 'lib/processor'
import { chains, mq } from 'lib'
import { setTimeout } from 'timers/promises'

export default class ApyFanout implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.compute)
  }

  async down() {
    await this.queue?.close()
  }

  async do() {
    for(const chain of chains) {
      const throttle = 16
      const periodMinutes = 24 * 60
      const period = periodMinutes * 60_000
      const DEFAULT_START = daysAgoInMs(30)

      for(const apyTime of await getLatestApyTimes(chain.id)) {
        const { address, blockTime } = apyTime
        const start = roundToNearestMinutes(Math.max(blockTime || 0, DEFAULT_START), periodMinutes)
        const end = roundToNearestMinutes(new Date().getTime(), periodMinutes)
        for(let time = start; time < end; time += period) {
          await this.queue?.add(mq.job.compute.apy, {
            chainId: chain.id, address, time: time / 1000
          })
        }
        await setTimeout(throttle)
      }
    }
  }
}

function daysAgoInMs(days: number): number {
  const now = new Date().getTime()
  return now - days * 24 * 60 * 60 * 1000
}

function roundToNearestMinutes(epochMs: number, interval: number): number {
  const date = new Date(epochMs)
  const minutes = date.getMinutes()
  const roundBy = Math.round(minutes / interval) * interval
  date.setMinutes(roundBy, 0, 0)
  return date.getTime()
}

export async function getLatestApyTimes(chainId: number) {
  const result = await db.query(`
    SELECT 
      v.address,
      FLOOR(EXTRACT(EPOCH FROM MAX(apy.block_time))) * 1000 as "blockTime"
    FROM vault v
    LEFT OUTER JOIN apy
    ON v.chain_id = apy.chain_id AND v.address = apy.address
    WHERE v.chain_id = $1
    GROUP BY v.address
  `, [chainId])
  return result.rows as { 
    address: `0x${string}`, 
    blockTime: number | null
  }[]
}
