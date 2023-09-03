import { Worker } from 'bullmq'
import { mq } from 'lib'
import { Processor } from 'lib/processor'
import { StateExtractor } from './state'
import { RpcClients, rpcs } from '../../../rpcs'

export default class YearnStrategyExtractor implements Processor {
  rpcs: RpcClients
  stateExtractor: StateExtractor = new StateExtractor()
  worker: Worker | undefined

  constructor() {
    this.rpcs = rpcs.next()
  }

  async up() {
    await this.stateExtractor.up()
    this.worker = mq.worker(mq.q.yearn.strategy.extract, async job => {
      switch(job.name) {
        case mq.q.yearn.strategy.extractJobs.logs:{
          throw new Error('not implemented')
          break

        } case mq.q.yearn.strategy.extractJobs.state:{
          await this.stateExtractor.extract(job)
          break

        } default: {
          throw new Error(`unknown job name ${job.name}`)
        }
      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.stateExtractor.down()
  }
}
