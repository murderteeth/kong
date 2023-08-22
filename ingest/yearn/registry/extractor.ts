import { Worker } from 'bullmq'
import { Processor } from '../../processor'
import { LogsHandler } from './logsHandler'
import { contracts } from 'lib/contracts/yearn/registries'
import { mq } from 'lib'
import { RpcClients, rpcs } from '../../rpcs'

export class YearnRegistryExtractor implements Processor {
  rpcs: RpcClients
  handler: LogsHandler
  worker: Worker | undefined

  constructor() {
    this.rpcs = rpcs.next()
    this.handler = new LogsHandler()
  }

  async up() {
    this.worker = mq.worker(mq.q.yearn.registry.extract, async job => {
      if(job.name !== mq.q.yearn.registry.extractJobs.logs) throw new Error(`unknown job name ${job.name}`)

      const { chainId, key, from, to } = job.data
      const rpc = this.rpcs[chainId]
      const contract = contracts.at(chainId, key)
      console.log('⬇️ ', job.queueName, job.name, chainId, key, from, to)

      const logs = await rpc.getLogs({
        address: contract.address,
        events: contract.events as any,
        fromBlock: BigInt(from), toBlock: BigInt(to)
      })

      await this.handler.handle(chainId, key, logs)
    })
  }

  async down() {
    await this.worker?.close()
    await this.handler.down()
  }
}