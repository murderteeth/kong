import { Queue } from 'bullmq'
import db, { getLatestBlock, saveBlockPointer } from '../../../db'
import { indexLogs } from '../indexLogs'
import { Processor } from 'lib/processor'
import { mq } from 'lib'

export class CatchupBlockPointer implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.yearn.vault.extract)
  }

  async down() {
    await this.queue?.close()
  }

  async catchup(job: any) {
    if(!this.queue) throw new Error('!queue')

    const { chainId } = job.data
    const latestBlock = await getLatestBlock(chainId)
    if(!latestBlock) throw new Error(`no latest block for chain ${chainId}`)

    const pointers = await getVaultBlockPointers(chainId)
    for(const pointer of pointers) {

      const from = pointer.pointer > pointer.activation_block_number
      ? pointer.pointer
      : pointer.activation_block_number

      console.log('🌭', 'catchup block', 'indexLogs', pointer.address, from, latestBlock)
      await indexLogs(this.queue, {
        chainId, address: pointer.address, from, to: latestBlock
      })

      await saveBlockPointer(chainId, pointer.address, latestBlock)
    }  
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
