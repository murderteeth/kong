import { Processor } from 'lib/processor'
import { RpcClients, rpcs } from '../../../rpcs'
import { parseAbi } from 'viem'
import { LogsHandler } from '../logsHandler'

export class LogsExtractor implements Processor {
  rpcs: RpcClients
  handler: LogsHandler = new LogsHandler()

  // here you can just list all versions of each event
  // don't need to check version
  events = parseAbi([
    `event StrategyAdded(address indexed strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)`,
    `event StrategyMigrated(address indexed oldVersion, address indexed newVersion)`,
    `event StrategyRevoked(address indexed strategy)`,
    `event UpdateWithdrawalQueue(address[20] queue)`,
    `event StrategyAddedToQueue(address indexed strategy)`,
    `event StrategyRemovedFromQueue(address indexed strategy)`
  ])

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
    const { chainId, address, from, to } = job.data
    const rpc = this.rpcs[chainId]
    console.log('⬇️ ', job.queueName, job.name, chainId, address, from, to)

    const logs = await rpc.getLogs({
      address,
      events: this.events as any,
      fromBlock: BigInt(from), toBlock: BigInt(to)
    })

    await this.handler.handle(chainId, address, logs)
  }
}
