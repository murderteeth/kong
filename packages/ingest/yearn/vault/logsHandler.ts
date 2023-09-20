import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { Processor } from 'lib/processor'

export class LogsHandler implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load.name] = mq.queue(mq.q.load.name)
    this.queues[mq.q.yearn.strategy.extract] = mq.queue(mq.q.yearn.strategy.extract)
    this.queues[mq.q.transfer.extract] = mq.queue(mq.q.transfer.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async handle(chainId: number, address: `0x${string}`, logs: any[]) {
    const strategyLogs = logs.filter(log => log.eventName === 'StrategyAdded')
    console.log('🪵', chainId, address, 'strategyLogs', strategyLogs.length)
    for(const log of strategyLogs) {
      await this.queues[mq.q.yearn.strategy.extract].add(mq.q.yearn.strategy.extractJobs.state, {
        chainId, 
        address: log.args.strategy.toString(),
        vaultAddress: address
      } as types.Strategy, {
        jobId: `${chainId}-${log.blockNumber}-${address}`
      })
    }

    const transferLogs = logs.filter(log => log.eventName === 'Transfer')
    console.log('🪵', chainId, address, 'transferLogs', transferLogs.length)
    const batchSize = 250
    const batch = [] as any[]
    for(const log of transferLogs) {
      const transfer = {
        chainId,
        address,
        sender: log.args.sender,
        receiver: log.args.receiver,
        amount: log.args.value.toString(),
        blockNumber: log.blockNumber.toString(),
        blockIndex: log.logIndex,
        transactionHash: log.transactionHash
      }

      batch.push(transfer)

      this.queues[mq.q.transfer.extract].add(mq.q.__noJobName, transfer, {
        jobId: `${transfer.chainId}-${transfer.blockNumber}-${transfer.blockIndex}`
      })

      if(batch.length >= batchSize) {
        await this.queues[mq.q.load.name].add(mq.q.load.jobs.transfer, { batch }, {
          attempts: 3, backoff: { type: 'exponential', delay: 1000 }
        })
        batch.length = 0
      }
    }

    if(batch.length > 0) {
      await this.queues[mq.q.load.name].add(mq.q.load.jobs.transfer, { batch }, {
        attempts: 3, backoff: { type: 'exponential', delay: 1000 }
      })
    }
  }
}
