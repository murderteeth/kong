import { mq, types } from 'lib'
import db, { camelToSnake } from '../../db'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'

export default class YearnVaultLoader implements Processor {
  worker: Worker | undefined

  async up() {
    this.worker = mq.worker(mq.q.yearn.vault.load, async job => {
      switch(job.name) {
        case mq.q.yearn.vault.loadJobs.vault: {
          const vault = job.data as types.Vault
          if(!vault.chainId) throw new Error('!chainId')
          if(!vault.address) throw new Error('!address')
          if(!vault.asOfBlockNumber) throw new Error('!asOfBlockNumber')

          console.log('📀', 'vault', vault.chainId, vault.address, vault.asOfBlockNumber)
          const query = toUpsertQuery('vault', 'chain_id, address', vault)
          const values = Object.values(vault)
          await db.query(query, values)
          break

        } case mq.q.yearn.vault.loadJobs.withdrawalQueue: {
          const withdrawalQueue = job.data as types.WithdrawalQueueItem[]
          for(const item of withdrawalQueue) {
            if(!item.chainId) throw new Error('!chainId')
            if(!item.vaultAddress) throw new Error('!address')
            if(!item.asOfBlockNumber) throw new Error('!asOfBlockNumber')

            console.log('📀', 'withdrawal queue', item.chainId, item.vaultAddress, item.queueIndex, item.asOfBlockNumber)
            const query = toUpsertQuery('withdrawal_queue', 'chain_id, vault_address, queue_index', item)
            const values = Object.values(item)
            await db.query(query, values)
          }
          break

        } default: {
          throw new Error(`unknown job name ${job.name}`)
        }
      }
    })
  }

  async down() {
    await this.worker?.close()
  }
}

const toUpsertQuery = (table: string, pk: string, update: any) => {
  const fields = Object.keys(update).map(key => camelToSnake(key)) as string[]
  const columns = fields.join(', ')
  const values = fields.map((field, index) => 
    field.endsWith('_timestamp') 
    ? `to_timestamp($${index + 1}::double precision)`
    : `$${index + 1}`
  ).join(', ')
  const updates = fields.map(field => `${field} = EXCLUDED.${field}`).join(', ')

  return `
    INSERT INTO ${table} (${columns}, updated_at)
    VALUES (${values}, NOW())
    ON CONFLICT (${pk})
    DO UPDATE SET 
      ${updates},
      updated_at = NOW()
    WHERE ${table}.as_of_block_number < EXCLUDED.as_of_block_number;
  `
}
