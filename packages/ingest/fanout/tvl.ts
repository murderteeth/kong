import { Queue } from 'bullmq'
import db, { query } from '../db'
import { Processor } from 'lib/processor'
import { chains, dates, math, mq } from 'lib'
import { setTimeout } from 'timers/promises'
import { endOfDay, findMissingTimestamps } from 'lib/dates'
import { InceptSchema, Thing, ThingSchema } from 'lib/types'

export default class TvlFanout implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.compute)
  }

  async down() {
    await this.queue?.close()
  }

  async fanout() {
    const throttle = 16
    const vaults = await query<Thing>(ThingSchema, 'SELECT * FROM thing WHERE label = $1', ['vault'])

    for (const vault of vaults) {
      const incept = InceptSchema.parse(vault.defaults)
      const start = endOfDay(math.max(incept.inceptTime, dates.DEFAULT_START()))
      const end = endOfDay(BigInt(Math.floor(new Date().getTime() / 1000)))

      const computed = (await db.query(`
      SELECT DISTINCT block_time
      FROM output
      WHERE chain_id = $1 AND address = $2 AND label = $3
      ORDER BY block_time ASC`, 
      [vault.chainId, vault.address, 'tvl']))
      .rows.map(row => BigInt(row.block_time))

      const missing = findMissingTimestamps(start, end, computed)

      for (const time of missing) {
        await this.queue?.add(mq.job.compute.tvl, {
          chainId: vault.chainId, address: vault.address, time
        })
        await setTimeout(throttle)
      }
    }
  }
}
