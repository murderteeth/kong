import { PublicClient, createPublicClient, parseAbi, webSocket } from 'viem'
import { mainnet } from 'viem/chains'
import { mq, types } from 'lib'
import { Queue, Worker } from 'bullmq'
import * as addresses from '../addresses'

const events = parseAbi([
  `event NewVault(address indexed token, uint256 indexed vaultId, uint256 vaultType, address vault, string apiVersion)`
])

class LogsHandler {
  queue: Queue
  constructor() {
    this.queue = mq.queue(mq.n.extract.vault)
  }

  async handle(networkId: number, logs: any[]) {
    for(const log of logs) {
      if(log.eventName === 'NewVault') {
        console.log('🪵', networkId, log.blockNumber, log.eventName)
        await this.queue.add(mq.n.extract.vault, {
          networkId,
          id: log.args.vaultId.toString(),
          type: log.args.vaultType.toString(),
          address: log.args.vault.toString(),
          apiVersion: log.args.apiVersion.toString(),
          baseAssetAddress: log.args.token.toString(),
          asOfBlockNumber: log.blockNumber.toString()
        } as types.Vault)
      }
    }
  }

  async down() {
    await this.queue.close()
  }
}

export class RegistryWatcher implements types.Processor {
  rpc: PublicClient
  handler: LogsHandler
  unwatch: (() => void) | undefined

  constructor() {
    this.rpc = createPublicClient({
      chain: mainnet, transport: webSocket(process.env.WSS_NETWORK_1)
    })
    this.handler = new LogsHandler()
  }

  async up() {
    this.unwatch = this.rpc.watchEvent({
      address: addresses.yearn[mainnet.id].registries[2].address,
      events,
      onLogs: async (logs) => {
        await this.handler.handle(this.rpc.chain?.id || 0, logs)
      },
      onError: (error) => {
        console.error('🤬', error)
      }
    })
  }

  async down() {
    if(this.unwatch) this.unwatch()
    await this.handler.down()
  }
}

export class RegistryWorker implements types.Processor {
  rpc: PublicClient
  handler: LogsHandler
  worker: Worker | undefined

  constructor() {
    this.rpc = createPublicClient({
      chain: mainnet, transport: webSocket(process.env.WSS_NETWORK_1)
    })
    this.handler = new LogsHandler()
  }

  async up() {
    this.worker = mq.worker(mq.n.extract.registry, async job => {
      const { fromBlock, toBlock } = job.data
      try {
        console.log('⬇️ ', job.name, fromBlock, toBlock)
        const logs = await this.rpc.getLogs({
          address: addresses.yearn[mainnet.id].registries[2].address,
          events, fromBlock, toBlock
        })
        await this.handler.handle(this.rpc.chain?.id || 0, logs)
        return true
      } catch(error) {
        console.error('🤬', job.name, error)
        return false
      }
    })
  }

  async down() {
    await this.worker?.close()
    await this.handler.down()
  }
}