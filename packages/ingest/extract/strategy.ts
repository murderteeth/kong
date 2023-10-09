import { mq, types } from 'lib'
import { parseAbi } from 'viem'
import { Processor } from 'lib/processor'
import { Queue } from 'bullmq'
import { rpcs } from 'lib/rpcs'

export class StrategyExtractor implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
  }

  async down() {
    await this.queue?.close()
  }

  async extract(data: any) {
    const strategy = data as types.Strategy

    const asOfBlockNumber = (await rpcs.next(strategy.chainId).getBlockNumber()).toString()
    const fields = await this.extractFields(strategy.chainId, strategy.address)
    // const activation = await this.extractActivation(rpc, strategy.address)

    const update = {
      ...strategy,
      ...fields,
      asOfBlockNumber
    } as types.Strategy

    await this.queue?.add(
      mq.job.load.strategy, update
    )
  }

  private async extractFields(chainId: number, address: `0x${string}`) {
    const multicallResult = await rpcs.next(chainId).multicall({ contracts: [
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
      apiVersion: multicallResult[1].result || '0.0.0'
    } as types.Vault
  }

  // private async extractActivation(rpc: PublicClient, address: `0x${string}`) {
  //   const activationBlockNumber = ((await db.query(
  //     `SELECT activation_block_number FROM strategy WHERE chain_id = $1 AND address = $2`, 
  //     [rpc.chain?.id, address]
  //   )).rows[0]?.activation_block_number || 0) as bigint
  
  //   if(activationBlockNumber > 0n) return {}
  
  //   const activationBlockTime = (await rpc.readContract({
  //     address, functionName: 'activation' as never,
  //     abi: parseAbi(['function activation() returns (uint256)'])
  //   }) || 0) as number
  
  //   if(!activationBlockTime) return {}
  
  //   return {
  //     activationBlockTime: activationBlockTime.toString(),
  //     activationBlockNumber: (await blocks.estimateHeight(rpc, activationBlockTime)).toString()
  //   }
  // }
}
