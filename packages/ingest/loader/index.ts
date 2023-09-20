import { mq, types } from 'lib'
import db, { camelToSnake, toUpsertQuery } from '../db'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import config from '../config'

export default class Loader implements Processor {
  worker: Worker | undefined

  async up() {
    const loaderConfig = config.processorPools.find(pool => pool.type === 'Loader')
    this.worker = mq.worker(mq.q.load.name, async job => {
      switch(job.name) {
        case mq.q.load.jobs.erc20: {
          const object = job.data as types.ERC20
          console.log('📀', 'erc20', object.chainId, object.address)
          await upsertErc20(object)
          break

        }
        case mq.q.load.jobs.transfer: {
          const { batch } = job.data as { batch: types.Transfer [] }
          console.log('📀', 'transfers', batch.length)
          await upsertTransfers(batch)
          break

        }
        default: {
          throw new Error(`unknown job name ${job.name}`)

        }
      }
    }, loaderConfig?.concurrency || 1)
  }

  async down() {
    await this.worker?.close()
  }
}

export async function upsertErc20(object: types.ERC20) {
  const query = `
    INSERT INTO erc20 (chain_id, address, name, symbol, decimals)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (chain_id, address)
    DO NOTHING;
  `

  const values = [
    object.chainId,
    object.address,
    object.name,
    object.symbol,
    object.decimals
  ]

  await db.query(query, values)
}

export async function upsertTransfers(batch: types.Transfer[]) {
  const client = await db.connect()

  try {
    await client.query('BEGIN')

    for(const object of batch) {
      await client.query(
        toUpsertQuery('transfer', 'chain_id, block_number, block_index', object),
        Object.values(object)
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
