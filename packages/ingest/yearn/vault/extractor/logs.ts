import { Processor } from 'lib/processor'
import { RpcClients, rpcs } from 'lib/rpcs'
import { parseAbi, parseAbiItem, zeroAddress } from 'viem'
import { LogsHandler } from '../logsHandler'

export class LogsExtractor implements Processor {
  rpcs: RpcClients = rpcs.next()
  handler: LogsHandler = new LogsHandler()

  async up() {
    await this.handler.up()
  }

  async down() {
    await this.handler.down()
  }

  async extract(job: any) {
    const { chainId, address, from, to } = job.data
    const rpc = this.rpcs[chainId]
    console.time('yearn-vault-extract-logs')
    console.log('⬇️ ', job.queueName, job.name, chainId, address, from, to)

    const strategies = await rpc.getLogs({
      address,
      events: parseAbi([
        `event StrategyAdded(address indexed strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)`,
      ]),
      fromBlock: BigInt(from), 
      toBlock: BigInt(to)
    }) as any[]

    const deposits = await rpc.getLogs({
      address,
      event: parseAbiItem(`event Transfer(address indexed sender, address indexed receiver, uint256 value)`),
      args: { sender: zeroAddress },
      fromBlock: BigInt(from), 
      toBlock: BigInt(to)
    }) as any[]

    const withdrawals = await rpc.getLogs({
      address,
      event: parseAbiItem(`event Transfer(address indexed sender, address indexed receiver, uint256 value)`),
      args: { receiver: zeroAddress },
      fromBlock: BigInt(from), 
      toBlock: BigInt(to)
    }) as any[]

    const logs = [
      ...strategies, 
      ...deposits, 
      ...withdrawals
    ]

    // for(const log of logs) {
    //   const block = await rpc.getBlock({ blockNumber: log.blockNumber })
    //   log.blockTimestamp = block.timestamp.toString()
    // }

    console.log('logs', logs[0])
    console.timeEnd('yearn-vault-extract-logs')
    await this.handler.handle(chainId, address, logs)
  }

}
