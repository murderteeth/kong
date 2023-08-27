import { mq, types } from 'lib'
import db, { camelToSnake } from '../../db'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'

export class YearnStrategyLoader implements Processor {
  worker: Worker | undefined

  async up() {
    this.worker = mq.worker(mq.q.yearn.strategy.load, async job => {
      const strategy = job.data as types.Strategy
      if(!strategy.chainId) throw new Error('!chainId')
      if(!strategy.address) throw new Error('!address')
      if(!strategy.asOfBlockNumber) throw new Error('!asOfBlockNumber')
      console.log('📀', 'strategy', strategy.chainId, strategy.address, strategy.asOfBlockNumber)
      await upsert(strategy)
    })
  }

  async down() {
    await this.worker?.close()
  }
}

export async function upsert(strategy: Partial<types.Strategy>) {
  const query = toUpsertQuery(strategy)
  const values = Object.values(strategy)
  await db.query(query, values)
}

const toUpsertQuery = (strategy: Partial<types.Strategy>) => {
  const fields = Object.keys(strategy).map(key => camelToSnake(key)) as string[]
  const columns = fields.join(', ')
  const values = fields.map((field, index) => 
    field.endsWith('_timestamp') 
    ? `to_timestamp($${index + 1}::double precision)`
    : `$${index + 1}`
  ).join(', ')
  const updates = fields.map(field => `${field} = EXCLUDED.${field}`).join(', ')

  return `
    INSERT INTO strategy (${columns}, updated_at)
    VALUES (${values}, NOW())
    ON CONFLICT (chain_id, address)
    DO UPDATE SET 
      ${updates},
      updated_at = NOW()
    WHERE strategy.as_of_block_number < EXCLUDED.as_of_block_number;
  `
}
