import { Queue, Worker } from 'bullmq'
import { mq } from 'lib'
import { Processor } from 'lib/processor'
import { indexLogs as indexRegistryLogs } from './registry/indexLogs'

export class YearnIndexer implements Processor {
  worker: Worker | undefined
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.yearn.registry.extract)
    this.worker = mq.worker(mq.q.yearn.index, async job => {
      switch(job.name) {
        case mq.q.yearn.indexJobs.registry:{
          await indexRegistryLogs(this.queue as Queue, job.data)
          break
        } case mq.q.yearn.indexJobs.vault:{

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