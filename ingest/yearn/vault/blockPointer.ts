import { Queue, Worker } from 'bullmq'
import { mq } from 'lib'
import { Processor } from '../../processor'
import db, { getLatestBlock, saveBlockPointer } from '../../db'
import { indexLogs } from './indexLogs'

export class YearnVaultBlockPointer implements Processor {
  worker: Worker | undefined
  queues: {
    [key: string]: Queue
  } = {}

  async up() {
    this.queues[mq.q.yearn.vault.extract] = mq.queue(mq.q.yearn.vault.extract)
    this.worker = mq.worker(mq.q.yearn.vault.pointer, async job => {
      switch(job.name) {
        case mq.q.yearn.vault.pointerJobs.catchup: {
          const { chainId } = job.data
          const latestBlock = await getLatestBlock(chainId)
          if(!latestBlock) throw new Error(`no latest block for chain ${chainId}`)

          const pointers = await getVaultBlockPointers(chainId)
          for(const pointer of pointers) {

            const from = pointer.pointer > pointer.activation_block_number
            ? pointer.pointer
            : pointer.activation_block_number

            await indexLogs(this.queues[mq.q.yearn.vault.extract], {
              chainId, address: pointer.address, from, to: latestBlock
            })

            await saveBlockPointer(chainId, pointer.address, latestBlock)
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
    Promise.all(Object.values(this.queues).map(queue => queue.close()))
  }
}

export async function getVaultBlockPointers(chainId: number) {
  const result = await db.query(`
    SELECT 
      v.address, 
      COALESCE(v.activation_block_number, 0) AS activation_block_number,
      COALESCE(p.block_number, 0) AS pointer
    FROM vault v
    LEFT JOIN block_pointer p
    ON v.chain_id = p.chain_id AND v.address = p.address
    WHERE v.chain_id = $1
  `, [chainId])
  return result.rows as { 
    address: `0x${string}`, 
    activation_block_number: bigint,
    pointer: bigint 
  }[]
}
