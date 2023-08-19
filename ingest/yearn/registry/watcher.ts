import { PublicClient, createPublicClient, parseAbi, webSocket } from 'viem'
import { mainnet } from 'viem/chains'
import { addresses } from 'lib'
import { Processor } from '../../processor'
import { LogsHandler, events } from './events'

export class RegistryWatcher implements Processor {
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
      events,
      address: addresses.yearn[mainnet.id].registries[2].address,
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
