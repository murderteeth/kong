import { PublicClient } from 'viem'
import { Processor } from '../../processor'
import { LogsHandler } from './logsHandler'
import { contracts } from 'lib/contracts/yearn/registries'
import { RpcClients, rpcs } from '../../rpcs'

export class YearnRegistryWatcher implements Processor {
  rpcs: RpcClients
  handler: LogsHandler
  watchers: (() => void)[] = []

  constructor() {
    this.rpcs = rpcs.next()
    this.handler = new LogsHandler()
  }

  watch(rpc: PublicClient, key: string) {
    const contract = contracts.at(rpc.chain?.id, key)
    return rpc.watchEvent({
      address: contract.address, 
      events: contract.events as any,
      onLogs: async (logs) => {
        await this.handler.handle(rpc.chain?.id as number, key, logs)
      },
      onError: (error) => {
        console.error('🤬', error)
      }
    })    
  }

  async up() {
    Object.values(this.rpcs).forEach((rpc: PublicClient) => {
      Object.keys(contracts.for(rpc.chain?.id)).forEach(key => {
        this.watchers.push(
          this.watch(rpc, key)
        )
      })
    })
  }

  async down() {
    this.watchers.forEach(unwatch => unwatch())
    await this.handler.down()
  }
}
