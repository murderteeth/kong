import { Queue, Worker } from 'bullmq'
import { mq } from 'lib'
import { contracts } from 'lib/contracts/yearn/registries'
import { Processor } from 'lib/processor'
import { getBlockPointer, getLatestBlock, saveBlockPointer } from '../../../db'
import { indexLogs } from '../indexLogs'

export default class YearnRegistryBlockPointer implements Processor {
  worker: Worker | undefined
  queues: {
    [key: string]: Queue
  } = {}

  async up() {
    this.queues[mq.q.yearn.registry.extract] = mq.queue(mq.q.yearn.registry.extract)
    this.worker = mq.worker(mq.q.yearn.registry.pointer, async job => {
      switch(job.name) {
        case mq.q.yearn.registry.pointerJobs.catchup: {
          const { chainId } = job.data
          const latestBlock = await getLatestBlock(chainId)
          if(!latestBlock) throw new Error(`no latest block for chain ${chainId}`)

          for(const key of Object.keys(contracts.for(chainId))) {
            const contract = contracts.at(chainId, key)
            const address = contract.address
            const blockPointer = await getBlockPointer(chainId, address)
            await indexLogs(this.queues[mq.q.yearn.registry.extract], {
              chainId, key, 
              from: blockPointer || contract.incept, 
              to: latestBlock
            })
            await saveBlockPointer(chainId, address, latestBlock)
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
