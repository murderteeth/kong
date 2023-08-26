import { mq, types } from 'lib'
import { blocks } from 'lib'
import { PublicClient, parseAbi, zeroAddress } from 'viem'
import { Processor } from '../../../processor'
import { Queue } from 'bullmq'
import { RpcClients, rpcs } from '../../../rpcs'
import db from '../../../db'

export class StateExtractor implements Processor {
  rpcs: RpcClients = rpcs.next()
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.yearn.strategy.load)
  }

  async down() {
    await this.queue?.close()
  }

  async extract(job: any) {
    const strategy = job.data as types.Strategy
    const rpc = this.rpcs[strategy.chainId]

    const asOfBlockNumber = (await rpc.getBlockNumber()).toString()
    const fields = await this.extractFields(rpc, strategy.address)
    // const activation = await this.extractActivation(rpc, strategy.address)

    const update = {
      ...strategy,
      ...fields,
      asOfBlockNumber
    } as types.Strategy

    await this.queue?.add(
      mq.q.yearn.strategy.loadJobs.strategy, update
    )
  }

  private async extractFields(rpc: PublicClient, address: `0x${string}`) {
    const multicallResult = await rpc.multicall({ contracts: [
      {
        address, functionName: 'name',
        abi: parseAbi(['function name() returns (string)'])
      },
      {
        address, functionName: 'apiVersion',
        abi: parseAbi(['function apiVersion() returns (string)'])
      }
    ]})
  
    return {
      name: multicallResult[0].result,
      apiVersion: multicallResult[1].result || '0.0.0',
      asOfBlockNumber: (await rpc.getBlockNumber()).toString()
    } as types.Vault
  }

  // private async extractActivation(rpc: PublicClient, address: `0x${string}`) {
  //   const activationBlockNumber = ((await db.query(
  //     `SELECT activation_block_number FROM strategy WHERE chain_id = $1 AND address = $2`, 
  //     [rpc.chain?.id, address]
  //   )).rows[0]?.activation_block_number || 0) as bigint
  
  //   if(activationBlockNumber > 0n) return {}
  
  //   const activationTimestamp = (await rpc.readContract({
  //     address, functionName: 'activation' as never,
  //     abi: parseAbi(['function activation() returns (uint256)'])
  //   }) || 0) as number
  
  //   if(!activationTimestamp) return {}
  
  //   return {
  //     activationTimestamp: activationTimestamp.toString(),
  //     activationBlockNumber: (await blocks.estimateHeight(rpc, activationTimestamp)).toString()
  //   }
  // }
}
