import { PublicClient } from 'viem'
import { mainnet } from 'viem/chains'
import { Worker } from 'bullmq'
import { Processor } from '../../processor'
import { LogsHandler } from './handler'
import { contracts } from 'lib/contracts/yearn/registries'
import { mq } from 'lib'
import { rpcs } from '../../rpcs'

export class RegistryExtractor implements Processor {
  rpc: PublicClient
  handler: LogsHandler
  worker: Worker | undefined

  constructor() {
    this.rpc = rpcs.next(mainnet.id)
    this.handler = new LogsHandler()
  }

  async up() {
    this.worker = mq.worker(mq.q.registry.n, async job => {
      if(job.name !== mq.q.registry.extract) return
      const { key, fromBlock, toBlock } = job.data
      const contract = contracts[key as keyof typeof contracts]
      console.log('⬇️ ', job.queueName, job.name, key, fromBlock, toBlock)
      const logs = await this.rpc.getLogs({
        address: contract.address,
        events: contract.events as any,
        fromBlock, toBlock
      })
      await this.handler.handle(key, this.rpc.chain?.id || 0, logs)
    })
  }

  async down() {
    await this.worker?.close()
    await this.handler.down()
  }
}