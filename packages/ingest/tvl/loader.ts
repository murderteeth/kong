import { mq, types } from 'lib'
import db from '../db'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'

export default class TvlLoader implements Processor {
  worker: Worker | undefined

  async up() {
    this.worker = mq.worker(mq.q.tvl.load, async job => {
      const tvl = job.data as types.TVL
      console.log('📀', 'tvl', tvl.chainId, tvl.address, tvl.tvlUsd)
      await upsert(tvl)
    })
  }

  async down() {
    await this.worker?.close()
  }
}

export async function upsert(tvl: types.TVL) {
  const query = `
    INSERT INTO tvl (chain_id, address, tvl_usd, as_of_block_number, as_of_time)
    VALUES ($1, $2, $3, $4, to_timestamp($5::double precision))
    ON CONFLICT (chain_id, address, as_of_time)
    DO UPDATE SET
      tvl_usd = EXCLUDED.tvl_usd,
      as_of_time = EXCLUDED.as_of_time;
  `

  const values = [
    tvl.chainId,
    tvl.address,
    tvl.tvlUsd,
    tvl.asOfBlockNumber,
    tvl.asOfTime
  ]

  await db.query(query, values)
}
