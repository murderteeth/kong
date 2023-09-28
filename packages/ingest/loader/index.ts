import { mq, types } from 'lib'
import db, { toUpsertSql } from '../db'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'

export default class Loader implements Processor {
  worker: Worker | undefined

  async up() {
    this.worker = mq.worker(mq.q.load, async job => {
      if(job.name === mq.job.load.erc20) {
        const object = job.data as types.ERC20
        console.log('📀', 'erc20', object.chainId, object.address)
        await upsertErc20(object)

      } else if(job.name === mq.job.load.harvest) {
        const { batch } = job.data as { batch: types.Harvest [] }
        console.log('📀', 'harvests', batch.length)
        await upsertHarvests(batch)

      } else if(job.name === mq.job.load.transfer) {
        const { batch } = job.data as { batch: types.Transfer [] }
        console.log('📀', 'transfers', batch.length)
        await upsertTransfers(batch)

      } else if(job.name === mq.job.load.apr) {
        const object = job.data as types.APR
        console.log('📀', 'apr', object.chainId, object.address, object.blockNumber)
        await upsertApr(object)

      } else if(job.name === mq.job.load.tvl) {
        const object = job.data as types.TVL
        console.log('📀', 'tvl', object.chainId, object.address, object.blockNumber)
        await upsertTvl(object)

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

export async function upsertHarvests(batch: types.Harvest[]) {
  const client = await db.connect()

  try {
    await client.query('BEGIN')

    for(const object of batch) {
      await client.query(
        toUpsertSql('harvest', 'chain_id, block_number, block_index', object),
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

export async function upsertTransfers(batch: types.Transfer[]) {
  const client = await db.connect()

  try {
    await client.query('BEGIN')

    for(const object of batch) {
      await client.query(
        toUpsertSql('transfer', 'chain_id, block_number, block_index', object),
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

export async function upsertApr(object: types.APR) {
  await db.query(
    toUpsertSql('apr', 'chain_id, address, block_timestamp', object),
    Object.values(object)
  )
}

export async function upsertTvl(tvl: types.TVL) {
  const query = `
    INSERT INTO tvl (chain_id, address, tvl_usd, block_number, block_time)
    VALUES ($1, $2, $3, $4, to_timestamp($5::double precision))
    ON CONFLICT (chain_id, address, block_time)
    DO UPDATE SET
      tvl_usd = EXCLUDED.tvl_usd;
  `

  const values = [
    tvl.chainId,
    tvl.address,
    tvl.tvlUsd,
    tvl.blockNumber,
    tvl.blockTime
  ]

  await db.query(query, values)
}
