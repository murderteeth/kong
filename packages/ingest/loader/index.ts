import { mq, types } from 'lib'
import db from '../db'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'

export default class Loader implements Processor {
  worker: Worker | undefined

  async up() {
    this.worker = mq.worker(mq.q.load.name, async job => {
      switch(job.name) {
        case mq.q.load.jobs.erc20: {
          const object = job.data as types.ERC20
          console.log('📀', 'erc20', object.chainId, object.address)
          await upsertErc20(object)
          break

        }
        case mq.q.load.jobs.transfer: {
          const object = job.data as types.Transfer
          console.log('📀', 'transfer', object.chainId, object.transactionHash)
          await upsertTransfer(object)
          break

        }
        default: {
          throw new Error(`unknown job name ${job.name}`)

        }
      }
    })
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

export async function upsertTransfer(object: types.Transfer) {
  const query = `
    INSERT INTO transfer (chain_id, address, sender, receiver, amount, amount_usd, block_number, block_timestamp, transaction_hash)
    VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8::double precision), $9)
    ON CONFLICT (chain_id, transaction_hash)
    DO UPDATE SET
      amount_usd = EXCLUDED.amount_usd;
  `

  const values = [
    object.chainId,
    object.address,
    object.sender,
    object.receiver,
    object.amount,
    object.amountUsd,
    object.blockNumber,
    object.blockTimestamp,
    object.transactionHash
  ]

  await db.query(query, values)
}
