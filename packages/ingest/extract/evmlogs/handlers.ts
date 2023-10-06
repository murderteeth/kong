import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { Processor } from 'lib/processor'

interface Handler {
  handle: (chainId: number, address: string, logs: any[]) => Promise<void>
}

export class Handlers implements Processor {
  __handlers: { [key: string]: Handler } = {}
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.yearn.vault.extract] = mq.queue(mq.q.yearn.vault.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  get(key: string) {
    return this.__handlers[key]
  }

  constructor() {
    this.__handlers['registry'] = { handle: async (chainId: number, address: string, logs: any[]) => {
      const newVaultEvents = ['NewExperimentalVault', 'NewVault', 'NewEndorsedVault']

      for(const log of logs) {
        if(newVaultEvents.includes(log.eventName)) {
          console.log('📋', chainId, address, log.blockNumber, log.eventName)

          const vault = {
            chainId,
            type: 'vault',
            address: log.args.vault.toString(),
            registryStatus: log.eventName === 'NewExperimentalVault' ? 'experimental' : 'endorsed',
            registryAddress: address,
            apiVersion: log.args.api_version?.toString() || log.args.apiVersion?.toString(),
            assetAddress: log.args.token.toString(),
            asOfBlockNumber: log.blockNumber.toString()
          } as types.Vault

          await this.queues[mq.q.yearn.vault.extract].add(mq.q.yearn.vault.extractJobs.state, vault, {
            jobId: `${chainId}-${log.blockNumber}-${vault.address}`
          })
        }
      }
    }}
  }
}
