import { mq, types } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import config from '../config'
import { rpcs } from 'lib/rpcs'

export default class Computer implements Processor {
  queue: Queue | undefined
  worker: Worker | undefined

  async up() {
    this.queue = mq.queue(mq.q.load.name)
    this.worker = mq.worker(mq.q.compute, async job => {
      if(job.name === mq.job.compute.harvestApr) {
        const harvest = job.data as types.Harvest
        console.log('🧮', 'harvest apr', harvest.chainId, harvest.blockNumber, harvest.blockIndex)
        const block = await rpcs.next(harvest.chainId).getBlock({ blockNumber: BigInt(harvest.blockNumber) })
        const apr = await computeApr(harvest)
        await this.queue?.add(mq.q.load.jobs.apr, {
          chainId: harvest.chainId,
          address: harvest.address,
          grossApr: apr.gross,
          netApr: apr.net,
          blockNumber: harvest.blockNumber,
          blockTimestamp: block.timestamp.toString()
        } as types.APR, {
          jobId: `${harvest.chainId}-${harvest.blockNumber}-${harvest.blockIndex}-harvest-apr`
        })
      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.queue?.close()
  }
}

async function computeApr(harvest: types.Harvest) {
  return {
    gross: 0.0,
    net: 0.0
  }
}
