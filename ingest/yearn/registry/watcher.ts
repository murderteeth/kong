import { PublicClient, createPublicClient, parseAbi, webSocket } from 'viem'
import { mainnet } from 'viem/chains'
import { Processor } from '../../processor'
import { LogsHandler } from './handler'
import { contracts } from 'lib/contracts/yearn/registries'

export class RegistryWatcher implements Processor {
  rpc: PublicClient
  handler: LogsHandler
  watchers: (() => void)[] = []

  constructor() {
    this.rpc = createPublicClient({
      chain: mainnet, transport: webSocket(process.env.WSS_NETWORK_1)
    })
    this.handler = new LogsHandler()
  }

  watch(key: keyof typeof contracts) {
    const contract = contracts[key]
    return this.rpc.watchEvent({
      address: contract.address, 
      events: contract.events as any,
      onLogs: async (logs) => {
        await this.handler.handle(key as keyof typeof contracts, this.rpc.chain?.id || 0, logs)
      },
      onError: (error) => {
        console.error('🤬', error)
      }
    })    
  }

  async up() {
    Object.keys(contracts).forEach(key => {
      this.watchers.push(this.watch(key as keyof typeof contracts))
    })
  }

  async down() {
    this.watchers.forEach(unwatch => unwatch())
    await this.handler.down()
  }
}
