import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { contracts } from 'lib/contracts/yearn/registries'

export class LogsHandler {
  queue: Queue
  constructor() {
    this.queue = mq.queue(mq.q.yearn.vault.extract)
  }

  async handle(chainId: number, key: string, logs: any[]) {
    const contract = contracts.at(chainId, key)
    for(const log of logs) {
      if(log.eventName === 'NewVault' || log.eventName === 'NewEndorsedVault') {
        console.log('🪵', chainId, log.blockNumber, log.eventName)
        await this.queue.add(mq.q.yearn.vault.extractJobs.state, {
          ...contract.parser.NewVault(log),
          chainId
        } as types.Vault, {
          jobId: `${chainId}-${log.blockNumber}-${log.args.vault.toString()}`
        })
      }
    }
  }

  async down() {
    await this.queue.close()
  }
}