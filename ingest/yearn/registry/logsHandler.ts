import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { contracts } from 'lib/contracts/yearn/registries'
import { Processor } from 'lib/processor'

export class LogsHandler implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.yearn.vault.extract)    
  }

  async down() {
    await this.queue?.close()
  }

  async handle(chainId: number, key: string, logs: any[]) {
    const newVaultEvents = ['NewExperimentalVault', 'NewVault', 'NewEndorsedVault']
    const contract = contracts.at(chainId, key)
    for(const log of logs) {
      if(newVaultEvents.includes(log.eventName)) {
        console.log('🪵', chainId, key, log.blockNumber, log.eventName)
        const registryStatus = log.eventName === 'NewExperimentalVault' ? 'experimental' : 'endorsed'
        await this.queue?.add(mq.q.yearn.vault.extractJobs.state, {
          ...contract.parser.NewVault(log, registryStatus),
          chainId
        } as types.Vault, {
          jobId: `${chainId}-${log.blockNumber}-${log.args.vault.toString()}`
        })
      }
    }
  }
}
