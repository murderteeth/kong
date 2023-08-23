import { Queue, Worker } from 'bullmq'
import { mq } from 'lib'
import { Processor } from './processor'
import { indexRegistry } from './yearn/registry/indexer'
import db, { fetchLatestBlock } from './db'
import { contracts } from 'lib/contracts/yearn/registries'

export class ArchivePointer implements Processor {
  worker: Worker | undefined
  queues: {
    [key: string]: Queue
  } = {}

  async up() {
    this.queues[mq.q.yearn.registry.extract] = mq.queue(mq.q.yearn.registry.extract)
    this.worker = mq.worker(mq.q.archive.pointer, async job => {
      switch(job.name) {
        case mq.q.archive.pointerJobs.catchup: {
          const { chainId } = job.data
          const latestBlock = await fetchLatestBlock(chainId)
          if(!latestBlock) throw new Error(`no latest block for chain ${chainId}`)
          const archivePointer = await fetchArchivePointer(chainId)
          for(const key of Object.keys(contracts.for(chainId))) {
            await indexRegistry(this.queues[mq.q.yearn.registry.extract], {
              chainId, key, from: archivePointer, to: latestBlock
            })
          }
          await upsertArchivePointer(chainId, latestBlock)
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

export async function fetchArchivePointer(chainId: number) {
  const result = await db.query(`
    SELECT block_number
    FROM archive_node_pointer
    WHERE chain_id = $1
  `, [chainId])
  return BigInt(result.rows[0]?.block_number || 0) as bigint
}

export async function upsertArchivePointer(chainId: number, blockNumber: bigint) {
  await db.query(`
    INSERT INTO public.archive_node_pointer (chain_id, block_number)
    VALUES ($1, $2)
    ON CONFLICT (chain_id)
    DO UPDATE SET
      block_number = EXCLUDED.block_number,
      updated_at = NOW();
  `, [chainId, blockNumber])
}
