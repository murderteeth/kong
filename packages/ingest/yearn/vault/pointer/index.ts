import { Worker } from 'bullmq'
import { mq } from 'lib'
import { Processor } from 'lib/processor'
import { CatchupBlockPointer } from './block'
import { CatchupTvl } from './tvl'

export default class YearnVaultPointer implements Processor {
  catchupBlock: CatchupBlockPointer = new CatchupBlockPointer()
  catchupTvl: CatchupTvl = new CatchupTvl()
  worker: Worker | undefined

  async up() {
    await this.catchupBlock.up()
    await this.catchupTvl.up()
    this.worker = mq.worker(mq.q.yearn.vault.pointer, async job => {
      await this.do(job)
    })
  }

  async down() {
    await this.worker?.close()
    await this.catchupTvl.down()
    await this.catchupBlock.down()
  }

  private async do(job: any) {
    switch(job.name) {
      case mq.q.yearn.vault.pointerJobs.catchup.block: {
        await this.catchupBlock.catchup(job)
        break

      } case mq.q.yearn.vault.pointerJobs.catchup.tvl: {
        await this.catchupTvl.catchup(job)
        break

      } default: {
        throw new Error(`unknown job name ${job.name}`)
      }
    }
  }
}
