import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { contracts } from 'lib/contracts/yearn/registries'

export class LogsHandler {
  queue: Queue
  constructor() {
    this.queue = mq.queue(mq.q.vault.n)
  }

  async handle(key: keyof typeof contracts, networkId: number, logs: any[]) {
    const contract = contracts[key]
    for(const log of logs) {
      if(log.eventName === 'NewVault') {
        console.log('🪵', networkId, log.blockNumber, log.eventName)
        await this.queue.add(mq.q.vault.extract, {
          ...contract.parser.NewVault(log),
          networkId
        } as types.Vault, {
          jobId: `${networkId}-${log.blockNumber}-${log.args.vault.toString()}`
        })
      }
    }
  }

  async down() {
    await this.queue.close()
  }
}