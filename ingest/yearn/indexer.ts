import { Queue, Worker } from 'bullmq'
import { mq } from 'lib'
import { Processor } from '../processor'
import { indexRegistry } from './registry/indexRegistry'

export class YearnIndexer implements Processor {
  worker: Worker | undefined
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.yearn.registry.extract)
    this.worker = mq.worker(mq.q.yearn.index, async job => {
      switch(job.name) {
        case mq.q.yearn.indexJobs.registry:{
          await indexRegistry(this.queue as Queue, job.data)
          break
        } default: {
          throw new Error(`unknown job name ${job.name}`)
        }
      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.queue?.close()
  }
}