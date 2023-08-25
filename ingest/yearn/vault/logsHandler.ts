import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { Processor } from '../../processor'

export class LogsHandler implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.yearn.strategy.extract)    
  }

  async down() {
    await this.queue?.close()
  }

  async handle(chainId: number, address: string, logs: any[]) {
    for(const log of logs) {
      if(log.eventName === 'StrategyAdded') {
        console.log('🪵', chainId, address, log.eventName, log.blockNumber, log.eventName)
        await this.queue?.add(mq.q.yearn.strategy.extractJobs.state, {
          chainId, 
          address: log.args.strategy.toString(),
          vaultAddress: address
        } as types.Strategy, {
          jobId: `${chainId}-${log.blockNumber}-${address}`
        })
      }
    }
  }
}
