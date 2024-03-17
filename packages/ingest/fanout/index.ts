import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import AbisFanout from './abis'
import EventsFanout from './events'
import TimeseriesFanout from './timeseries'

export default class Fanout implements Processor {
  worker: Worker | undefined

  fanouts = {
    [mq.job.fanout.abis.name]: new AbisFanout(),
    [mq.job.fanout.events.name]: new EventsFanout(),
    [mq.job.fanout.timeseries.name]: new TimeseriesFanout()
  } as { [key: string]: Processor & { fanout: (data?: any) => Promise<void> } }

  async up() {
    this.worker = mq.worker(mq.q.fanout, async job => {
      const label = `🍃 ${job.name} ${job.id}`
      console.time(label)
      await this.fanouts[job.name].fanout(job.data)
      console.timeEnd(label)
    })
  }

  async down() {
    await this.worker?.close()
  }
}
