import { Queue } from 'bullmq'
import db from '../../../db'
import { Processor } from 'lib/processor'
import { chains, mq } from 'lib'
import { setTimeout } from 'timers/promises'

export class CatchupTvl implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.yearn.vault.extract)
  }

  async down() {
    await this.queue?.close()
  }

  async catchup(job: any) {
    if(!this.queue) throw new Error('!queue')
    const { chainId } = job.data
    if(chainId) {
      await this.catchupChain(chainId)
    } else {
      for(const chain of chains) {
        await this.catchupChain(chain.id)
      }
    }
  }

  async catchupChain(chainId: number) {
    const throttle = 16
    const periodMinutes = 24 * 60
    const period = periodMinutes * 60_000
    const defaultStart = daysAgoInMs(30)
    console.log('⚾️', 'catchup tvl', chainId)

    const latestTvlTimes = await getLatestTvlTimes(chainId)
    for(const tvlTime of latestTvlTimes) {
      const { address, as_of_time } = tvlTime
      const start = roundToNearestMinutes(Math.max(as_of_time || 0, defaultStart), periodMinutes)
      const end = roundToNearestMinutes(new Date().getTime(), periodMinutes)
      for(let time = start; time < end; time += period) {
        await this.queue?.add(mq.q.yearn.vault.extractJobs.tvl, {
          chainId, address, time: time / 1000
        })
      }
      await setTimeout(throttle)
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

export async function getLatestTvlTimes(chainId: number) {
  const result = await db.query(`
    SELECT 
      v.address,
      FLOOR(EXTRACT(EPOCH FROM MAX(tvl.as_of_time))) * 1000 as as_of_time
    FROM vault v
    LEFT OUTER JOIN tvl
    ON v.chain_id = tvl.chain_id AND v.address = tvl.address
    WHERE v.chain_id = $1
    GROUP BY v.address
  `, [chainId])
  return result.rows as { 
    address: `0x${string}`, 
    as_of_time: number | null
  }[]
}
