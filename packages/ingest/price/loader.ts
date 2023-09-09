import { mq, types } from 'lib'
import db from '../db'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'

export default class PriceLoader implements Processor {
  worker: Worker | undefined

  async up() {
    this.worker = mq.worker(mq.q.price.load, async job => {
      const price = job.data as types.Price
      console.log('📀', 'price', price.symbol, price.priceUsd)
      await upsert(price)
    })
  }

  async down() {
    await this.worker?.close()
  }
}

export async function upsert(price: types.Price) {
  const query = `
    INSERT INTO price (chain_id, token_address, symbol, price_usd, as_of_block_number, as_of_time)
    VALUES ($1, $2, $3, $4, $5, to_timestamp($6::double precision))
    ON CONFLICT (chain_id, token_address, as_of_time)
    DO UPDATE SET
      price_usd = EXCLUDED.price_usd,
      as_of_time = EXCLUDED.as_of_time;
  `
  const values = [
    price.chainId, 
    price.tokenAddress, 
    price.symbol,
    price.priceUsd,
    price.asOfBlockNumber,
    price.asOfTime
  ]

  await db.query(query, values)
}
