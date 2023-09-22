import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'
import { parseAbi, parseAbiItem, zeroAddress } from 'viem'
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
    const start = process.hrtime()
    const { chainId, address, from, to } = job.data
    console.log('⬇️ ', job.queueName, job.name, chainId, address, from, to)

    const strategies = await rpcs.next(chainId).getLogs({
      address,
      events: parseAbi([
        `event StrategyAdded(address indexed strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)`,
      ]),
      fromBlock: BigInt(from), 
      toBlock: BigInt(to)
    }) as any[]

    const harvests = await rpcs.next(chainId).getLogs({
      address,
      events: parseAbi([
        `event StrategyReported(address indexed strategy, uint256 gain, uint256 loss, uint256 debtPaid, uint256 totalGain, uint256 totalLoss, uint256 totalDebt, uint256 debtAdded, uint256 debtRatio)`
      ]),
      fromBlock: BigInt(from), 
      toBlock: BigInt(to)
    }) as any[]

    const transfers = await rpcs.next(chainId).getLogs({
      address,
      event: parseAbiItem(`event Transfer(address indexed sender, address indexed receiver, uint256 value)`),
      args: {},
      fromBlock: BigInt(from), 
      toBlock: BigInt(to)
    }) as any[]

    const depositsAndWithdrawals = transfers.filter(log => log.args.sender === zeroAddress || log.args.receiver === zeroAddress)

    const logs = [
      ...strategies, 
      ...harvests,
      ...depositsAndWithdrawals
    ]

    const [seconds, nanoseconds] = process.hrtime(start)
    const milliseconds = (seconds * 1e3) + (nanoseconds / 1e6)
    console.log('⏱️', 'yearn-vault-extract-logs', milliseconds, 'ms')
    await this.handler.handle(chainId, address, logs)
  }
}
