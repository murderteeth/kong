import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { Processor } from 'lib/processor'
import { fetchErc20PriceUsd } from 'lib/prices'
import { RpcClients, rpcs } from '../../rpcs'
import db from '../../db'
import { parseAbi } from 'viem'

export class LogsHandler implements Processor {
  rpcs: RpcClients = rpcs.next()
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load.name] = mq.queue(mq.q.load.name)
    this.queues[mq.q.yearn.strategy.extract] = mq.queue(mq.q.yearn.strategy.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async handle(chainId: number, address: `0x${string}`, logs: any[]) {
    for(const log of logs) {
      console.log('🪵', chainId, address, log.eventName, log.blockNumber, log.eventName)

      if(log.eventName === 'StrategyAdded') {
        await this.queues[mq.q.yearn.strategy.extract].add(mq.q.yearn.strategy.extractJobs.state, {
          chainId, 
          address: log.args.strategy.toString(),
          vaultAddress: address
        } as types.Strategy, {
          jobId: `${chainId}-${log.blockNumber}-${address}`
        })

      } else if(log.eventName === 'Transfer') {
        // this goes into its own transfer extract job
        const rpc = this.rpcs[chainId]
        const { address: assetAddress, decimals } = await this.asset(chainId, address)
        const assetPriceUsd = await fetchErc20PriceUsd(rpc, assetAddress, log.blockNumber)
        const precision = 1_000_000n
        const pps_scaled = await rpc.readContract({
          address, functionName: 'pricePerShare' as never,
          abi: parseAbi(['function pricePerShare() returns (uint256)']),
          blockNumber: log.blockNumber
        }) as bigint
        const pps = Number(pps_scaled * precision / BigInt(10 ** decimals)) / Number(precision)
        const shares = Number(log.args.value * precision / BigInt(10 ** decimals)) / Number(precision)
        const amountUsd = pps * shares * assetPriceUsd

        await this.queues[mq.q.load.name].add(mq.q.load.jobs.transfer, {
          chainId,
          address,
          sender: log.args.sender,
          receiver: log.args.receiver,
          amount: log.args.value.toString(),
          amountUsd,
          blockNumber: log.blockNumber.toString(),
          blockTimestamp: log.blockTimestamp.toString(),
          transactionHash: log.transactionHash
        })

      }
    }
  }

  async asset(chainId: number, address: `0x${string}`) {
    const result = await db.query(`
      SELECT asset_address as address, decimals
      FROM vault
      WHERE chain_id = $1 AND address = $2;
    `, [chainId, address])
    return result.rows[0] as {
      address: `0x${string}`,
      decimals: number
    }
  }
}
