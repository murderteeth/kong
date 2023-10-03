import { Worker } from 'bullmq'
import { mq } from 'lib'
import { Processor } from 'lib/processor'
import { StateExtractor } from './state'
import { LogsExtractor } from './logs'
import { TvlExtractor } from './tvl'
import { HarvestExtractor } from './harvest'

export default class YearnVaultExtractor implements Processor {
  logsExtractor: LogsExtractor = new LogsExtractor()
  stateExtractor: StateExtractor = new StateExtractor()
  tvlExtractor: TvlExtractor = new TvlExtractor()
  harvestExtractor: HarvestExtractor = new HarvestExtractor()
  worker: Worker | undefined

  async up() {
    await this.logsExtractor.up()
    await this.stateExtractor.up()
    await this.tvlExtractor.up()
    await this.harvestExtractor.up()
    this.worker = mq.worker(mq.q.yearn.vault.extract, async job => {
      await this.do(job)
    })
  }

  async down() {
    await this.worker?.close()
    await this.harvestExtractor.down()
    await this.tvlExtractor.down()
    await this.stateExtractor.down()
    await this.logsExtractor.down()
  }

  private async do(job: any) {
    switch(job.name) {
      case mq.q.yearn.vault.extractJobs.logs:{
        await this.logsExtractor.extract(job)
        break

      } case mq.q.yearn.vault.extractJobs.state:{
        await this.stateExtractor.extract(job)
        break

      } case mq.q.yearn.vault.extractJobs.tvl:{
        await this.tvlExtractor.extract(job)
        break

      } case mq.q.yearn.vault.extractJobs.harvest:{
        await this.harvestExtractor.extract(job)
        break

      } default: {
        throw new Error(`unknown job name ${job.name}`)
      }
    }
  }
}
