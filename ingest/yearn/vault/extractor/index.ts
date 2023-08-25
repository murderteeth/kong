import { Queue, Worker } from 'bullmq'
import { mq, types } from 'lib'
import { Processor } from '../../../processor'
import { extractState } from './state'
import { RpcClients, rpcs } from '../../../rpcs'
import { LogsExtractor } from './logs'

export class YearnVaultExtractor implements Processor {
  rpcs: RpcClients
  logsExtractor: LogsExtractor = new LogsExtractor()
  worker: Worker | undefined
  queue: Queue | undefined

  constructor() {
    this.rpcs = rpcs.next()
  }

  async up() {
    await this.logsExtractor.up()
    this.queue = mq.queue(mq.q.yearn.vault.load)
    this.worker = mq.worker(mq.q.yearn.vault.extract, async job => {
      switch(job.name) {
        case mq.q.yearn.vault.extractJobs.logs:{
          await this.logsExtractor.extract(job)
          break

        } case mq.q.yearn.vault.extractJobs.state:{
          const state = await extractState(this.rpcs[job.data.chainId], job.data as types.Vault)
          await this.queue?.add('', state)
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
    await this.logsExtractor.down()
  }
}
