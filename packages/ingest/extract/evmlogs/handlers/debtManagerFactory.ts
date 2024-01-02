import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { Handler } from '..'

export class DebtManagerFactoryHandler implements Handler {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async handle(chainId: number, address: `0x${string}`, logs: any[]) {
    for(const log of logs) {
      console.log('📋', chainId, address, log.blockNumber, log.eventName)

      const vault = {
        chainId,
        type: 'vault',
        address: log.args.vault.toString(),
        debtManager: log.args.allocator.toString(),
        __as_of_block: log.blockNumber.toString()
      } as types.Vault

      await this.queues[mq.q.load].add(mq.job.load.vault, vault)
    }
  }
}
