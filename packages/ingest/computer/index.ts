import { mq, types } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'
import { compute as computeHarvestApr } from './harvestApr'

export default class Computer implements Processor {
  queue: Queue | undefined
  worker: Worker | undefined

  async up() {
    this.queue = mq.queue(mq.q.load.name)
    this.worker = mq.worker(mq.q.compute, async job => {
      if(job.name === mq.job.compute.harvestApr) {
        const { chainId, address, blockNumber, blockIndex } = job.data as { chainId: number, address: `0x${string}`, blockNumber: string, blockIndex: number }
        console.log('🧮', 'harvest apr', chainId, blockNumber, blockIndex)
        const apr = await computeHarvestApr(chainId, address, BigInt(blockNumber))
        if(apr === null) return

        const block = await rpcs.next(chainId).getBlock({ blockNumber: BigInt(apr.blockNumber) })
        await this.queue?.add(mq.q.load.jobs.apr, {
          chainId: chainId,
          address: address,
          grossApr: apr.gross,
          netApr: apr.net,
          blockNumber: apr.blockNumber.toString(),
          blockTimestamp: block.timestamp.toString()
        } as types.APR, {
          jobId: `${chainId}-${blockNumber}-${blockIndex}-harvest-apr`
        })
      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.queue?.close()
  }
}
