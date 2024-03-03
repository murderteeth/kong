import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { HarvestSchema } from 'lib/types'

export class VaultHandler {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async handle(chainId: number, address: `0x${string}`, logs: any[]) {
    const harvestLogs__v2 = logs.filter(log => log.eventName === 'StrategyReported' && log.args.total_refunds === undefined)
    const harvests__v2 = this.logs2Harvests__v2(chainId, address, harvestLogs__v2)
    console.log('📋', chainId, address, 'harvests__v2', harvests__v2.length)
    await this.handleHarvests(harvests__v2)

    const harvestLogs__v3 = logs.filter(log => log.eventName === 'Reported')
    const harvests__v3 = this.logs2Harvests__v3(chainId, address, harvestLogs__v3)
    console.log('📋', chainId, address, 'harvests__v3', harvests__v3.length)
    await this.handleHarvests(harvests__v3)

    const transfers = logs.filter(log => log.eventName === 'Transfer')
    console.log('📋', chainId, address, 'transfers', transfers.length)
    await this.handleTransfers(chainId, address, transfers)
  }

  private logs2Harvests__v2(chainId: number, address: string, logs: any[]) {
    return HarvestSchema.array().parse(logs.map(log => ({
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
    })))
  }

  private logs2Harvests__v3(chainId: number, address: string, logs: any[]) {
    return HarvestSchema.array().parse(logs.map(log => ({
      chainId,
      address,
      profit: log.args.profit.toString(),
      loss: log.args.loss.toString(),
      protocolFees: log.args.protocolFees.toString(),
      performanceFees: log.args.performanceFees.toString(),
      blockNumber: log.blockNumber.toString(),
      blockIndex: log.logIndex,
      transactionHash: log.transactionHash
    })))
  }

  private async handleHarvests(harvests: types.Harvest[]) {
    const batchSize = 250
    const batch = [] as any[]
    for(const harvest of harvests) {
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
