import { PublicClient, createPublicClient, parseAbi, webSocket } from 'viem'
import { mainnet } from 'viem/chains'
import { addresses, mq, types } from 'lib'
import { Worker } from 'bullmq'
import { Processor } from '../../processor'
import { LogsHandler, events } from './events'

export class RegistryExtractor implements Processor {
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
    this.worker = mq.worker(mq.q.registry.n, async job => {
      if(job.name !== mq.q.registry.extract) return
      const { fromBlock, toBlock } = job.data
      console.log('⬇️ ', job.queueName, job.name, fromBlock, toBlock)
      const logs = await this.rpc.getLogs({
        address: addresses.yearn[mainnet.id].registries[2].address,
        events, fromBlock, toBlock
      })
      await this.handler.handle(this.rpc.chain?.id || 0, logs)
    })
  }

  async down() {
    await this.worker?.close()
    await this.handler.down()
  }
}