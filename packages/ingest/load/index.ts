import { mq, strings, types } from 'lib'
import db, { toUpsertSql } from '../db'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import sparkline from './sparkline'
import { PoolClient } from 'pg'

export default class Load implements Processor {
  worker?: Worker
  queue?: Queue

  handlers: Record<string, (data: any) => Promise<any>> = {
    [mq.job.load.block]: async data => 
    await upsert(data, 'latest_block', 'chain_id', 
      'WHERE latest_block.block_number < EXCLUDED.block_number'
    ),

    [mq.job.load.erc20]: async data => 
    await upsert(data, 'erc20', 'chain_id, address'),

    [mq.job.load.vault]: async data => 
    await upsert(data, 'vault', 'chain_id, address', 
      'WHERE EXCLUDED.as_of_block_number IS NULL OR vault.as_of_block_number < EXCLUDED.as_of_block_number'
    ),

    [mq.job.load.withdrawalQueue]: async data => 
    await upsertBatch(data.batch, 'withdrawal_queue', 'chain_id, vault_address, queue_index', 
      'WHERE EXCLUDED.as_of_block_number IS NULL OR withdrawal_queue.as_of_block_number < EXCLUDED.as_of_block_number'
    ),

    [mq.job.load.vaultDebt]: async data => 
    await upsertBatch(data.batch, 'vault_debt', 'chain_id, lender, borrower', 
      'WHERE vault_debt.block_number < EXCLUDED.block_number'
    ),

    [mq.job.load.strategy]: async data => {
    await upsert(data, 'strategy', 'chain_id, address',
      'WHERE EXCLUDED.as_of_block_number IS NULL OR strategy.as_of_block_number < EXCLUDED.as_of_block_number'
    )},

    [mq.job.load.strategyLenderStatus]: async data => {
      if(data.batch.length === 0) return
      if((new Set(data.batch.map((d: types.StrategyLenderStatus) => d.chainId))).size > 1) throw new Error('chain ids > 1')
      if((new Set(data.batch.map((d: types.StrategyLenderStatus) => d.strategyAddress))).size > 1) throw new Error('strategy addresses > 1')
      await replaceWithBatch(
        data.batch,
        'strategy_lender_status', 
        'chain_id, strategy_address, address', 
        `chain_id = ${data.batch[0].chainId} AND strategy_address = '${data.batch[0].strategyAddress}'`
      )
    },

    [mq.job.load.harvest]: async data => 
    await upsertBatch(data.batch, 'harvest', 'chain_id, block_number, block_index, address'),

    [mq.job.load.riskGroup]: async data => 
    await upsertBatch(data.batch, 'risk_group', 'chain_id, name'),

    [mq.job.load.transfer]: async data => 
    await upsertBatch(data.batch, 'transfer', 'chain_id, block_number, block_index'),

    [mq.job.load.tvl]: async (data: types.TVL) => {
      await upsert(data, 'tvl', 'chain_id, address, block_time'),
      await this.queue?.add(mq.job.load.sparkline.tvl, { 
        chainId: data.chainId, address: data.address 
      })
    },

    [mq.job.load.apy]: async (data: types.APY) => {
      await upsert(data, 'apy', 'chain_id, address, block_time'),
      await this.queue?.add(mq.job.load.sparkline.apy, { 
        chainId: data.chainId, address: data.address 
      })
    },

    [mq.job.load.apr]: async (data: types.APR) => {
      await upsert(data, 'apr', 'chain_id, address, block_time')
      await this.queue?.add(mq.job.load.sparkline.apr, { 
        chainId: data.chainId, address: data.address 
      })
    },

    [mq.job.load.sparkline.tvl]: async data => 
    await sparkline.tvl(data),

    [mq.job.load.sparkline.apy]: async data => 
    await sparkline.apy(data),

    [mq.job.load.sparkline.apr]: async data => 
    await sparkline.apr(data),

    [mq.job.load.monitor]: async data => 
    await upsert({ singleton: true, latest: data }, 'monitor', 'singleton'),
  }

  async up() {
    this.queue = mq.queue(mq.q.load)
    this.worker = mq.worker(mq.q.load, async job => {
      const label = `📀 ${job.name} ${job.id}`
      console.time(label)
      await this.handlers[job.name](job.data)
      console.timeEnd(label)
    })
  }

  async down() {
    await this.worker?.close()
    await this.queue?.close()
  }
}

export async function upsertAsOfBlock(data: any, table: string, pk: string[]) {
  if(data.chainId == null) throw new Error('!data.chainId')
  if(data.asOfBlockNumber == null) throw new Error('!data.asOfBlockNumber')
  const asOfBlockNumber = BigInt(data.asOfBlockNumber)
  delete data.asOfBlockNumber

  const tablePk = pk.map(n => data[strings.snakeToCamel(n)]).join('/')
  const pointerKey = (field: string) => `${table}/${tablePk}/${field}`
  const fields = Object.keys(data).filter(k => !pk.includes(strings.camelToSnake(k)))

  const client = await db.connect()
  await client.query('BEGIN')

  try {
    const pointers = (await client.query(
      `SELECT pointer as "key", block_number as "blockNumber" from block_pointer WHERE pointer = ANY($1)`, 
      [fields.map(f => pointerKey(f))]
    )).rows
  
    const pkfields = pk.reduce((fields, field) => ({ ...fields, [strings.snakeToCamel(field)]: data[strings.snakeToCamel(field)] }), {})
    const freshValues: any = {}
  
    for(const field of fields) {
      const pointer = pointers.find(p => String(p.key) === String(pointerKey(field)))
      if(pointer && pointer.blockNumber > asOfBlockNumber) continue
      freshValues[strings.snakeToCamel(field)] = data[field]
    }
  
    if(Object.keys(freshValues).length === 0) return
  
    const update = { ...pkfields, ...freshValues }
  
    await client.query(
      toUpsertSql(table, pk.join(', '), update),
      Object.values(update)
    )
  
    const pointerUpdates = Object.keys(freshValues).map((f: any) => ({
      pointer: pointerKey(f),
      blockNumber: asOfBlockNumber
    }))

    await upsertBatch(pointerUpdates, 'block_pointer', 'pointer', undefined, client)
    await client.query('COMMIT')

  } catch(error) {
    await client.query('ROLLBACK')
    throw error

  } finally {
    client.release()
  }
}

export async function upsert(data: any, table: string, pk: string, where?: string, _client?: PoolClient) {
  await (_client ?? db).query(
    toUpsertSql(table, pk, data, where),
    Object.values(data)
  )
}

export async function upsertBatch(batch: any[], table: string, pk: string, where?: string, _client?: PoolClient) {
  const client = _client ?? await db.connect()
  try {
    if(!_client) await client.query('BEGIN')
    for(const object of batch) {
      await client.query(
        toUpsertSql(table, pk, object, where),
        Object.values(object)
      )
    }
    if(!_client) await client.query('COMMIT')
  } catch (error) {
    if(!_client) await client.query('ROLLBACK')
    throw error
  } finally {
    if(!_client) client.release()
  }
}

export async function replaceWithBatch(batch: any[], table: string, pk: string, where: string, _client?: PoolClient) {
  const client = _client ?? await db.connect()
  try {
    if(!_client) await client.query('BEGIN')
    if(!_client) await client.query(`DELETE FROM ${table} WHERE ${where};`)
    for(const object of batch) {
      await client.query(
        toUpsertSql(table, pk, object),
        Object.values(object)
      )
    }
    if(!_client) await client.query('COMMIT')
  } catch (error) {
    if(!_client) await client.query('ROLLBACK')
    throw error
  } finally {
    if(!_client) client.release()
  }
}
