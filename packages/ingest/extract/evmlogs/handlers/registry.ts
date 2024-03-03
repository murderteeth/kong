import { Queue } from 'bullmq'
import { mq, types } from 'lib'

export class RegistryHandler {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async handle(chainId: number, address: `0x${string}`, logs: any[]) {
    const newVaultEvents = ['NewExperimentalVault', 'NewVault']

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
          __as_of_block: log.blockNumber.toString()
        } as types.Vault

        await this.queues[mq.q.extract].add(mq.job.extract.vault, vault, {
          jobId: `${chainId}-${log.blockNumber}-${vault.address}`
        })
      }
    }
  }
}
