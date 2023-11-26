import { mq } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import db from '../db'

export default class HarvestAprFanout implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.compute] = mq.queue(mq.q.compute)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async fanout() {
    const harvestsMissingAprs = (await db.query(`
WITH RankedHarvests AS (
  SELECT 
    h.chain_id, 
    h.address, 
    h.block_number,
    h.block_index,
    ROW_NUMBER() OVER(PARTITION BY h.chain_id, h.address ORDER BY h.block_number ASC) AS row_num
  FROM 
    harvest h
)

SELECT 
  rh.chain_id as "chainId",
  rh.address,
  rh.block_number as "blockNumber",
  rh.block_index as "blockIndex"
FROM 
  RankedHarvests rh
LEFT JOIN 
  apr a ON rh.chain_id = a.chain_id 
    AND rh.address = a.address 
    AND rh.block_number = a.block_number
WHERE 
  a.chain_id IS NULL
  AND rh.row_num > 1
ORDER BY rh.block_number ASC, rh.block_index ASC;`)).rows

    for(const harvest of harvestsMissingAprs) {
      await this.queues[mq.q.compute].add(mq.job.compute.harvestApr, harvest)
    }
  }
}
