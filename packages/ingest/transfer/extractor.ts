import { mq, types } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'
import { fetchErc20PriceUsd } from 'lib/prices'
import { getErc20 } from '../db'

export default class TransferExtractor implements Processor {
  queue: Queue | undefined
  worker: Worker | undefined

  async up() {
    this.queue = mq.queue(mq.q.load.name)
    this.worker = mq.worker(mq.q.transfer.extract, async job => {
      const transfer = job.data as types.Transfer

      const { decimals } = await getErc20(transfer.chainId, transfer.address)
      const tokens = Number(BigInt(transfer.amount) * 10_000n / BigInt(10 ** decimals)) / 10_000
      const { price } = await fetchErc20PriceUsd(
        transfer.chainId, 
        transfer.address, 
        BigInt(transfer.blockNumber)
      )
      const amountUsd =  tokens * price
      const { timestamp } = await rpcs.next(transfer.chainId).getBlock({ blockNumber: BigInt(transfer.blockNumber) })

      transfer.amountUsd = amountUsd
      transfer.blockTimestamp = timestamp.toString()
      await this.queue?.add(mq.q.load.jobs.transfer, { batch: [transfer] })
    })
  }

  async down() {
    await this.worker?.close()
    await this.queue?.close()
  }
}
