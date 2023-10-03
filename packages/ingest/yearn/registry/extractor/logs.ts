import { contracts } from 'lib/contracts/yearn/registries'
import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'
import { LogsHandler } from '../logsHandler'

export class LogsExtractor implements Processor {
  handler: LogsHandler = new LogsHandler()

  async up() {
    await this.handler.up()
  }

  async down() {
    await this.handler.down()
  }

  async extract(job: any) {
    const { chainId, key, from, to } = job.data
    const contract = contracts.at(chainId, key)
    console.log('⬇️ ', job.queueName, job.name, chainId, key, from, to)

    const logs = await rpcs.next(chainId).getLogs({
      address: contract.address,
      events: contract.events as any,
      fromBlock: BigInt(from), toBlock: BigInt(to)
    })

    await this.handler.handle(chainId, key, logs)
  }
}
