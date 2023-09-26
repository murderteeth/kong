import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { Processor } from 'lib/processor'

export class LogsHandler implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.yearn.vault.extract] = mq.queue(mq.q.yearn.vault.extract)
    this.queues[mq.q.load.name] = mq.queue(mq.q.load.name)
    this.queues[mq.q.yearn.strategy.extract] = mq.queue(mq.q.yearn.strategy.extract)
    this.queues[mq.q.transfer.extract] = mq.queue(mq.q.transfer.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async handle(chainId: number, address: `0x${string}`, logs: any[]) {
    const strategies = logs.filter(log => log.eventName === 'StrategyAdded')
    console.log('🪵', chainId, address, 'strategies', strategies.length)
    await this.handleStrategies(chainId, address, strategies)

    const harvests = logs.filter(log => log.eventName === 'StrategyReported')
    console.log('🪵', chainId, address, 'harvests', harvests.length)
    await this.handleHarvests(chainId, address, harvests)

    const transfers = logs.filter(log => log.eventName === 'Transfer')
    console.log('🪵', chainId, address, 'transfers', transfers.length)
    await this.handleTransfers(chainId, address, transfers)
  }

  private async handleStrategies(chainId: number, address: string, logs: any[]) {
    for(const log of logs) {
      await this.queues[mq.q.yearn.strategy.extract].add(mq.q.yearn.strategy.extractJobs.state, {
        chainId, 
        address: log.args.strategy.toString(),
        vaultAddress: address
      } as types.Strategy, {
        jobId: `${chainId}-${log.blockNumber}-${address}`
      })
    }
  }

  private async handleHarvests(chainId: number, address: string, logs: any[]) {
    const batchSize = 250
    const batch = [] as any[]
    for(const log of logs) {
      const harvest = {
        chainId,
        address: log.args.strategy.toString(),
        profit: log.args.gain.toString(),
        loss: log.args.loss.toString(),
        totalProfit: log.args.totalGain.toString(),
        totalLoss: log.args.totalLoss.toString(),
        totalDebt: log.args.debtPaid.toString(),
        blockNumber: log.blockNumber.toString(),
        blockIndex: log.logIndex,
        transactionHash: log.transactionHash
      }

      batch.push(harvest)

      this.queues[mq.q.yearn.vault.extract].add(mq.q.yearn.vault.extractJobs.harvest, harvest, {
        jobId: `${harvest.chainId}-${harvest.blockNumber}-${harvest.blockIndex}`
      })

      if(batch.length >= batchSize) {
        await this.queues[mq.q.load.name].add(mq.q.load.jobs.harvest, { batch }, {
          attempts: 3, backoff: { type: 'exponential', delay: 1000 }
        })
        batch.length = 0
      }
    }

    if(batch.length > 0) {
      await this.queues[mq.q.load.name].add(mq.q.load.jobs.harvest, { batch }, {
        attempts: 3, backoff: { type: 'exponential', delay: 1000 }
      })
    }
  }

  private async handleTransfers(chainId: number, address: string, logs: any[]) {
    const batchSize = 250
    const batch = [] as any[]
    for(const log of logs) {
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
