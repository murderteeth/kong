import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { parseAbi } from 'viem'

export const events = parseAbi([
  `event NewVault(address indexed token, uint256 indexed vaultId, uint256 vaultType, address vault, string apiVersion)`
])

export class LogsHandler {
  queue: Queue
  constructor() {
    this.queue = mq.queue(mq.q.vault.n)
  }

  async handle(networkId: number, logs: any[]) {
    for(const log of logs) {
      if(log.eventName === 'NewVault') {
        console.log('🪵', networkId, log.blockNumber, log.eventName)
        await this.queue.add(mq.q.vault.extract, {
          networkId,
          id: log.args.vaultId.toString(),
          type: log.args.vaultType.toString(),
          address: log.args.vault.toString(),
          apiVersion: log.args.apiVersion.toString(),
          baseAssetAddress: log.args.token.toString(),
          asOfBlockNumber: log.blockNumber.toString()
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