import { mq, types } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import { fetchErc20PriceUsd } from 'lib/prices'
import { getErc20 } from '../db'
import { getBlock } from 'lib/blocks'

export class TransferExtractor implements Processor {
  queue: Queue | undefined
  worker: Worker | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
  }

  async down() {
    await this.queue?.close()
  }

  async extract(data: any) {
    const transfer = data as types.Transfer
    const key = '-' + Object.values(transfer).join('-')
    const { decimals } = await getErc20(transfer.chainId, transfer.address)
    const tokens = Number(BigInt(transfer.amount) * 10_000n / BigInt(10 ** decimals)) / 10_000
    const { priceUsd } = await fetchErc20PriceUsd(
      transfer.chainId, 
      transfer.address, 
      BigInt(transfer.blockNumber)
    )
    const amountUsd =  tokens * priceUsd
    const { timestamp } = await getBlock(transfer.chainId, BigInt(transfer.blockNumber))

    transfer.amountUsd = amountUsd
    transfer.blockTime = timestamp.toString()
    await this.queue?.add(mq.job.load.transfer, { batch: [transfer] }, {
      priority: mq.LOWEST_PRIORITY
    })
  }
}
