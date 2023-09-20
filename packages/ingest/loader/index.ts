import { mq, types } from 'lib'
import db from '../db'
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
          const objects = job.data as types.Transfer []
          console.log('📀', 'transfers', objects.length)
          await upsertTransfers(objects)
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

export async function upsertTransfers(objects: types.Transfer[]) {
  const query = `
  INSERT INTO transfer (chain_id, address, sender, receiver, amount, amount_usd, block_number, block_timestamp, transaction_hash)
  VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8::double precision), $9);`

  const bactchSize = 200
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    for(let i = 0; i < objects.length; i += bactchSize) {
      const batch = objects.slice(i, i + bactchSize)
      for(const object of batch) {
        await client.query(query, [
          object.chainId,
          object.address,
          object.sender,
          object.receiver,
          object.amount,
          object.amountUsd,
          object.blockNumber,
          object.blockTimestamp,
          object.transactionHash
        ])
      }
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
