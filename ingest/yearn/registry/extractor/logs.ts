import { contracts } from 'lib/contracts/yearn/registries'
import { Processor } from 'lib/processor'
import { RpcClients, rpcs } from '../../../rpcs'
import { LogsHandler } from '../logsHandler'

export class LogsExtractor implements Processor {
  rpcs: RpcClients
  handler: LogsHandler = new LogsHandler()

  constructor() {
    this.rpcs = rpcs.next()
  }

  async up() {
    await this.handler.up()
  }

  async down() {
    await this.handler.down()
  }

  async extract(job: any) {
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
  }
}
