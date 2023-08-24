import { Queue, Worker } from 'bullmq'
import { mq } from 'lib'
import { Processor } from '../../../processor'
import { LogsExtractor } from './logs'
import { ApetaxExtractor } from './apetax'

export class YearnRegistryExtractor implements Processor {
  logsExtractor: LogsExtractor = new LogsExtractor()
  apetaxExtractor: ApetaxExtractor = new ApetaxExtractor()
  worker: Worker | undefined

  async up() {
    await this.logsExtractor.up()
    await this.apetaxExtractor.up()
    this.worker = mq.worker(mq.q.yearn.registry.extract, async job => {
      switch(job.name) {
        case mq.q.yearn.registry.extractJobs.logs: {
          await this.logsExtractor.extract(job)
          break
        } case mq.q.yearn.registry.extractJobs.apetax: {
          await this.apetaxExtractor.extract(job)
          break
        } default: {
          throw new Error(`unknown job name ${job.name}`)
        }
      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.apetaxExtractor.down()
    await this.logsExtractor.down()
  }
}
