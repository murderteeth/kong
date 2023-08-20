import { Worker } from 'bullmq'
import { Processor } from '../../processor'
import { LogsHandler } from './handler'
import { contracts } from 'lib/contracts/yearn/registries'
import { mq } from 'lib'
import { RpcClients, rpcs } from '../../rpcs'

export class RegistryExtractor implements Processor {
  rpcs: RpcClients
  handler: LogsHandler
  worker: Worker | undefined

  constructor() {
    this.rpcs = rpcs.next()
    this.handler = new LogsHandler()
  }

  async up() {
    this.worker = mq.worker(mq.q.registry.n, async job => {
      if(job.name !== mq.q.registry.extract) return

      const { chainId, key, fromBlock, toBlock } = job.data

      const rpc = this.rpcs[chainId]
      const contract = contracts.at(chainId, key)

      console.log('⬇️ ', job.queueName, job.name, chainId, key, fromBlock, toBlock)

      const logs = await rpc.getLogs({
        address: contract.address,
        events: contract.events as any,
        fromBlock, toBlock
      })

      await this.handler.handle(chainId, key, logs)
    })
  }

  async down() {
    await this.worker?.close()
    await this.handler.down()
  }
}