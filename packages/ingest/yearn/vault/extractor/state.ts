import { mq, types } from 'lib'
import { blocks } from 'lib'
import { PublicClient, parseAbi, zeroAddress } from 'viem'
import { Processor } from 'lib/processor'
import { Queue } from 'bullmq'
import { RpcClients, rpcs } from '../../../rpcs'
import db from '../../../db'
import { estimateCreationBlock } from 'lib/blocks'

export class StateExtractor implements Processor {
  rpcs: RpcClients = rpcs.next()
  queues: {
    [name: string]: Queue
  } = {}

  async up() {
    this.queues[mq.q.yearn.vault.load] = mq.queue(mq.q.yearn.vault.load)
    this.queues[mq.q.yearn.strategy.extract] = mq.queue(mq.q.yearn.strategy.extract)
  }

  async down() {
    Promise.all(Object.values(this.queues).map(queue => queue.close()))
  }

  async extract(job: any) {
    const vault = job.data as types.Vault
    const rpc = this.rpcs[vault.chainId]
    const asOfBlockNumber = (await rpc.getBlockNumber()).toString()
    const fields = await this.extractFields(rpc, vault.address)
    const asset = await this.extractAsset(rpc, fields.assetAddress as `0x${string}`)
    const activation = await this.extractActivation(rpc, vault.address)
    const withdrawalQueue = await this.extractWithdrawalQueue(rpc, vault.address)

    const update = {
      ...vault,
      ...fields,
      ...asset,
      ...activation,
      asOfBlockNumber
    } as types.Vault

    await this.queues[mq.q.yearn.vault.load].add(
      mq.q.yearn.vault.loadJobs.vault, update
    )

    await this.queues[mq.q.yearn.vault.load].add(
      mq.q.yearn.vault.loadJobs.withdrawalQueue, withdrawalQueue.map((strategyAddress, queueIndex) => ({
        chainId: rpc.chain?.id,
        vaultAddress: vault.address,
        queueIndex, strategyAddress, asOfBlockNumber
    })) as types.WithdrawalQueueItem[])

    for(const strategy of withdrawalQueue) {
      if(!strategy || strategy === zeroAddress) continue
      await this.queues[mq.q.yearn.strategy.extract].add(
        mq.q.yearn.strategy.extractJobs.state, {
          chainId: rpc.chain?.id,
          address: strategy,
          vaultAddress: vault.address,
          asOfBlockNumber
      } as types.Strategy)
    }
  }

  private async extractFields(rpc: PublicClient, address: `0x${string}`) {
    const multicallResult = await rpc.multicall({ contracts: [
      {
        address, functionName: 'name',
        abi: parseAbi(['function name() returns (string)'])
      },
      {
        address, functionName: 'symbol',
        abi: parseAbi(['function symbol() returns (string)'])
      },
      {
        address, functionName: 'decimals',
        abi: parseAbi(['function decimals() returns (uint32)'])
      },
      {
        address, functionName: 'totalAssets',
        abi: parseAbi(['function totalAssets() returns (uint256)'])
      },
      {
        address, functionName: 'apiVersion',
        abi: parseAbi(['function apiVersion() returns (string)'])
      },
      {
        address, functionName: 'api_version',
        abi: parseAbi(['function api_version() returns (string)'])
      },
      {
        address, functionName: 'token',
        abi: parseAbi(['function token() returns (address)'])
      }, 
      {
        address, functionName: 'asset',
        abi: parseAbi(['function asset() returns (address)'])
      }
    ]})

    return {
      name: multicallResult[0].result,
      symbol: multicallResult[1].result,
      decimals: multicallResult[2].result,
      totalAssets: multicallResult[3].result?.toString(),
      apiVersion: multicallResult[4].result || multicallResult[5].result || '0.0.0',
      assetAddress: multicallResult[6].result || multicallResult[7].result
    } as types.Vault
  }
  
  private async extractAsset(rpc: PublicClient, address: `0x${string}`) {
    const result = await rpc.multicall({ contracts: [
      {
        address, functionName: 'name',
        abi: parseAbi(['function name() returns (string)'])
      },
      {
        address, functionName: 'symbol',
        abi: parseAbi(['function symbol() returns (string)'])
      }
    ]})
  
    return {
      assetName: result[0].result,
      assetSymbol: result[1].result
    }
  }

  private async extractActivation(rpc: PublicClient, address: `0x${string}`) {
    const { activation_timestamp, activation_block_number } = (await db.query(
      `SELECT
        FLOOR(EXTRACT(EPOCH FROM activation_timestamp)) as activation_timestamp,
        activation_block_number
      FROM
        vault
      WHERE
        chain_id = $1 AND address = $2`, 
      [rpc.chain?.id, address]
    )).rows[0] || {}

    if(activation_timestamp) return {
      activationTimestamp: activation_timestamp.toString(),
      activationBlockNumber: activation_block_number as bigint
    }

    try {
      const activationTimestamp = await rpc.readContract({
        address, functionName: 'activation' as never,
        abi: parseAbi(['function activation() returns (uint256)'])
      }) as number

      return {
        activationTimestamp: activationTimestamp.toString(),
        activationBlockNumber: (await blocks.estimateHeight(rpc, activationTimestamp)).toString()
      }
    } catch(error) {
      console.log('⚠', rpc.chain?.id, address, '!activation field')
      const createBlock = await estimateCreationBlock(rpc, address)
      return {
        activationTimestamp: createBlock.timestamp.toString(),
        activationBlockNumber: createBlock.number.toString()
      }
    }
  }

  private async extractWithdrawalQueue(rpc: PublicClient, address: `0x${string}`) {
    const withdrawalQueue = []

    // TODO: y dis no work? runtime error 'property abi cannot be destructured'
    // const contracts = Array(20).map((_, i) => ({
    //   address, functionName: 'withdrawalQueue', args: [BigInt(i)],
    //   abi: parseAbi(['function withdrawalQueue(uint256) returns (address)'])    
    // }))
    // const results = await rpc.multicall({ contracts })
    //

    const results = await rpc.multicall({ contracts: [
      { args: [0n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [1n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [2n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [3n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [4n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [5n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [6n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [7n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [8n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [9n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [10n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [11n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [12n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [13n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [14n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [15n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [16n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [17n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [18n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
      { args: [19n], address, functionName: 'withdrawalQueue', abi: parseAbi(['function withdrawalQueue(uint256) returns (address)']) },
    ]})

    for(const result of results) {
      const strategy = result.status === 'failure' || result.result === zeroAddress
      ? null
      : result.result as `0x${string}`
      withdrawalQueue.push(strategy)
    }

    return withdrawalQueue
  }
}
