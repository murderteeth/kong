import { mq } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'
import { Handlers as LogHandlers } from './evmlogs/handlers'
import { ApetaxExtractor } from './apetax'

export default class Extract implements Processor {
  logHandlers: LogHandlers = new LogHandlers()
  apetaxExtractor: ApetaxExtractor = new ApetaxExtractor()
  worker: Worker | undefined

  async up() {
    await this.logHandlers.up()
    await this.apetaxExtractor.up()
    this.worker = mq.worker(mq.q.extract, async job => {
      console.log('⬇️', job.name)
      if(job.name === mq.job.extract.evmlogs) {
        const { chainId, address, events, from, to, handler } = job.data
        const logs = await rpcs.next(chainId).getLogs({
          address,
          events: JSON.parse(events),
          fromBlock: BigInt(from), toBlock: BigInt(to)
        })
        await this.logHandlers.get(handler).handle(chainId, address, logs)

      } else if(job.name === mq.job.extract.apetax) {
        this.apetaxExtractor.extract(job.data)

      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.apetaxExtractor.down()
    await this.logHandlers.down()
  }
}
