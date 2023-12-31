import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { Handler } from '..'

export class VaultHandler implements Handler {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async handle(chainId: number, address: `0x${string}`, logs: any[]) {
    const harvests = logs.filter(log => log.eventName === 'StrategyReported')
    console.log('📋', chainId, address, 'harvests', harvests.length)
    await this.handleHarvests(chainId, address, harvests)

    const transfers = logs.filter(log => log.eventName === 'Transfer')
    console.log('📋', chainId, address, 'transfers', transfers.length)
    await this.handleTransfers(chainId, address, transfers)
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
        totalDebt: log.args.totalDebt.toString(),
        blockNumber: log.blockNumber.toString(),
        blockIndex: log.logIndex,
        transactionHash: log.transactionHash
      }

      batch.push(harvest)

      this.queues[mq.q.extract].add(mq.job.extract.harvest, harvest, {
        jobId: `${harvest.chainId}-${harvest.blockNumber}-${harvest.blockIndex}`
      })

      if(batch.length >= batchSize) {
        await this.queues[mq.q.load].add(mq.job.load.harvest, { batch }, {
          attempts: 3, backoff: { type: 'exponential', delay: 1000 }
        })
        batch.length = 0
      }
    }

    if(batch.length > 0) {
      await this.queues[mq.q.load].add(mq.job.load.harvest, { batch }, {
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

      this.queues[mq.q.extract].add(mq.job.extract.transfer, transfer, {
        jobId: `${transfer.chainId}-${transfer.blockNumber}-${transfer.blockIndex}`,
        priority: mq.LOWEST_PRIORITY
      })

      if(batch.length >= batchSize) {
        await this.queues[mq.q.load].add(mq.job.load.transfer, { batch }, {
          attempts: 3, backoff: { type: 'exponential', delay: 1000 }
        })
        batch.length = 0
      }
    }

    if(batch.length > 0) {
      await this.queues[mq.q.load].add(mq.job.load.transfer, { batch }, {
        attempts: 3, backoff: { type: 'exponential', delay: 1000 }
      })
    }
  }
}
