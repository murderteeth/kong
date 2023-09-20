import { JobsOptions, Queue } from 'bullmq'
import { mq, types } from 'lib'
import { Processor } from 'lib/processor'
import { fetchErc20PriceUsd } from 'lib/prices'
import { RpcClients, rpcs } from 'lib/rpcs'

export class LogsHandler implements Processor {
  rpcs: RpcClients = rpcs.next()
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load.name] = mq.queue(mq.q.load.name)
    this.queues[mq.q.yearn.strategy.extract] = mq.queue(mq.q.yearn.strategy.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async handle(chainId: number, address: `0x${string}`, logs: any[]) {
    const batchSize = 1000
    const transferBatch = [] as any[]

    console.log('🪵', chainId, address, 'strategyAdded', logs.filter(log => log.eventName === 'StrategyAdded').length)
    console.log('🪵', chainId, address, 'transfers', logs.filter(log => log.eventName === 'Transfer').length)

    for(const log of logs) {
      if(log.eventName === 'StrategyAdded') {
        await this.queues[mq.q.yearn.strategy.extract].add(mq.q.yearn.strategy.extractJobs.state, {
          chainId, 
          address: log.args.strategy.toString(),
          vaultAddress: address
        } as types.Strategy, {
          jobId: `${chainId}-${log.blockNumber}-${address}`
        })

      } else if(log.eventName === 'Transfer') {
        // const rpc = this.rpcs[chainId]
        // const { price: amountUsd } = await fetchErc20PriceUsd(rpc, address, log.blockNumber)
        // const { timestamp } = await rpc.getBlock({ blockNumber: log.blockNumber })
        //
        // design a new transfer upsert like vault
        // queue a transfer extract job
        // implement transfer extract worker w rpc calls
        //
        const amountUsd = 0
        transferBatch.push({
          chainId,
          address,
          sender: log.args.sender,
          receiver: log.args.receiver,
          amount: log.args.value.toString(),
          amountUsd,
          blockNumber: log.blockNumber.toString(),
          blockTimestamp: log.blockTimestamp.toString(),
          transactionHash: log.transactionHash
        })

        if(transferBatch.length >= batchSize) {
          console.log('🌭', 'logsHandler', 'q transfer loader', transferBatch.length, batchSize)
          await this.queues[mq.q.load.name].add(mq.q.load.jobs.transfer, transferBatch, {
            jobId: `${chainId}-${address}-${transferBatch[0].transactionHash}-${transferBatch[transferBatch.length - 1].transactionHash}`
          })
          transferBatch.length = 0
        }
      }
    }

    if(transferBatch.length > 0) {
      console.log('🌭', 'logsHandler', 'q transfer loader finally', transferBatch.length)
      await this.queues[mq.q.load.name].add(mq.q.load.jobs.transfer, transferBatch, {
        jobId: `${chainId}-${address}-${transferBatch[0].transactionHash}-${transferBatch[transferBatch.length - 1].transactionHash}`
      })
    }
  }
}
