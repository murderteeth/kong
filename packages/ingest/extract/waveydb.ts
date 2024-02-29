import { chains, mq, types } from 'lib'
import { Queue } from 'bullmq'
import { Pool } from 'pg'
import { Processor } from 'lib/processor'
import { getAddress } from 'viem'
import { PriceSchema } from 'lib/types'

const db = new Pool({
  host: process.env.WAVEYDB_HOST,
  port: (process.env.WAVEYDB_PORT || 5432) as number,
  ssl: {
    rejectUnauthorized: false
  },
  database: process.env.WAVEYDB_NAME,
  user: process.env.WAVEYDB_USER,
  password: process.env.WAVEYDB_PASSWORD,
  max: 4,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 60_000
})

export class WaveyDbExtractor implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async extract() {
    await this.extract_prices_for_v2()
  }

  async extract_prices_for_v2() {
    const result = await db.query(`
      SELECT 
        chain_id,
        want_token,
        block,
        timestamp,
        want_price_at_block
      FROM
        reports;
    `)

    for (const row of result.rows) {
      const price = PriceSchema.parse({
        chainId: row.chain_id,
        address: getAddress(row.want_token),
        priceUsd: row.want_price_at_block,
        priceSource: 'yprice via waveydb',
        blockNumber: row.block,
        blockTime: row.timestamp
      })
      await this.queues[mq.q.load].add(mq.job.load.price, price)
    }
  }
}
