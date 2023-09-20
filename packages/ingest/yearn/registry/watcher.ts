import { PublicClient } from 'viem'
import { Processor } from 'lib/processor'
import { LogsHandler } from './logsHandler'
import { contracts } from 'lib/contracts/yearn/registries'
import { rpcs } from 'lib/rpcs'

export default class YearnRegistryWatcher implements Processor {
  handler: LogsHandler = new LogsHandler()
  watchers: (() => void)[] = []

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
    const _rpcs = rpcs.nextAll()
    Object.values(_rpcs).forEach((rpc: PublicClient) => {
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
