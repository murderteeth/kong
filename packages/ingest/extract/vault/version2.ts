import { blocks, math, mq, types } from 'lib'
import { rpcs } from '../../rpcs'
import { parseAbi, zeroAddress } from 'viem'
import { estimateCreationBlock } from 'lib/blocks'
import { Processor } from 'lib/processor'
import { Queue } from 'bullmq'
import db from '../../db'

export class VaultExtractor__v2 implements Processor {
  queues: { [name: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(queue => queue.close()))
  }

  async extract(vault: types.Vault, asOfBlockNumber: bigint) {
    const fields = await extractFields(vault)
    const asset = await extractAsset(vault.chainId, fields.assetAddress as `0x${string}`)
    const activation = await extractActivation(vault.chainId, vault.address)
    const withdrawalQueue = await extractWithdrawalQueue(vault.chainId, vault.address, asOfBlockNumber)
  
    const update = {
      ...vault,
      ...fields,
      ...asset,
      ...activation,
      asOfBlockNumber
    } as types.Vault
  
    await this.queues[mq.q.load].add(
      mq.job.load.erc20, {
        chainId: vault.chainId,
        address: fields.assetAddress,
        name: asset.assetName,
        symbol: asset.assetSymbol,
        decimals: fields.decimals
      }
    )
  
    await this.queues[mq.q.load].add(
      mq.job.load.erc20, {
        chainId: vault.chainId,
        address: vault.address,
        name: fields.name,
        symbol: fields.symbol,
        decimals: fields.decimals
      }
    )
  
    await this.queues[mq.q.load].add(
      mq.job.load.vault, update
    )
  
    await this.queues[mq.q.load].add(
      mq.job.load.withdrawalQueue, { batch: withdrawalQueue.map((strategyAddress, queueIndex) => ({
        chainId: vault.chainId,
        vaultAddress: vault.address,
        queueIndex, strategyAddress, asOfBlockNumber
    })) as types.WithdrawalQueueItem[] })
  
    for(const strategy of withdrawalQueue) {
      await this.queues[mq.q.extract].add(
        mq.job.extract.strategy, {
          chainId: vault.chainId,
          address: strategy,
          vaultAddress: vault.address,
          withdrawalQueueIndex: withdrawalQueue.indexOf(strategy),
          asOfBlockNumber
      } as types.Strategy)
    }
  }
}

async function extractFields(vault: types.Vault) {
  const multicallResult = await rpcs.next(vault.chainId).multicall({ contracts: [
    {
      address: vault.address, functionName: 'name',
      abi: parseAbi(['function name() returns (string)'])
    },
    {
      address: vault.address, functionName: 'symbol',
      abi: parseAbi(['function symbol() returns (string)'])
    },
    {
      address: vault.address, functionName: 'decimals',
      abi: parseAbi(['function decimals() returns (uint32)'])
    },
    {
      address: vault.address, functionName: 'totalAssets',
      abi: parseAbi(['function totalAssets() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'apiVersion',
      abi: parseAbi(['function apiVersion() returns (string)'])
    },
    {
      address: vault.address, functionName: 'api_version',
      abi: parseAbi(['function api_version() returns (string)'])
    },
    {
      address: vault.address, functionName: 'token',
      abi: parseAbi(['function token() returns (address)'])
    }, 
    {
      address: vault.address, functionName: 'asset',
      abi: parseAbi(['function asset() returns (address)'])
    },
    {
      address: vault.address, functionName: 'governance',
      abi: parseAbi(['function governance() returns (address)'])
    },
    {
      address: vault.address, functionName: 'availableDepositLimit',
      abi: parseAbi(['function availableDepositLimit() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'performanceFee',
      abi: parseAbi(['function performanceFee() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'managementFee',
      abi: parseAbi(['function managementFee() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'lockedProfitDegradation',
      abi: parseAbi(['function lockedProfitDegradation() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'lockedProfitDegration',
      abi: parseAbi(['function lockedProfitDegration() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'totalDebt',
      abi: parseAbi(['function totalDebt() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'debtRatio',
      abi: parseAbi(['function debtRatio() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'depositLimit',
      abi: parseAbi(['function depositLimit() returns (uint256)'])
    }
  ]})

  return {
    name: multicallResult[0].result,
    symbol: multicallResult[1].result,
    decimals: multicallResult[2].result,
    totalAssets: multicallResult[3].result,
    apiVersion: multicallResult[4].result || multicallResult[5].result || '0.0.0',
    assetAddress: multicallResult[6].result || multicallResult[7].result,
    governance: multicallResult[8].result,
    availableDepositLimit: multicallResult[9].result,
    performanceFee: multicallResult[10].result,
    managementFee: multicallResult[11].result,
    lockedProfitDegradation: multicallResult[12].result || multicallResult[13].result,
    totalDebt: multicallResult[14].result,
    debtRatio: multicallResult[15].result,
    depositLimit: multicallResult[16].result
  } as types.Vault
}

async function extractAsset(chainId: number, address: `0x${string}`) {
  const result = await rpcs.next(chainId).multicall({ contracts: [
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

async function extractActivation(chainId: number, address: `0x${string}`) {
  const { activation_block_time, activation_block_number } = (await db.query(
    `SELECT
      FLOOR(EXTRACT(EPOCH FROM activation_block_time)) as activation_block_time,
      activation_block_number
    FROM
      vault
    WHERE
      chain_id = $1 AND address = $2`, 
    [chainId, address]
  )).rows[0] || {}

  if(activation_block_time) return {
    activationBlockTime: activation_block_time,
    activationBlockNumber: activation_block_number as bigint
  }

  try {
    const activationBlockTime = await rpcs.next(chainId).readContract({
      address, functionName: 'activation',
      abi: parseAbi(['function activation() view returns (uint256)'])
    }) as bigint

    return {
      activationBlockTime: activationBlockTime,
      activationBlockNumber: (await blocks.estimateHeight(chainId, activationBlockTime))
    }
  } catch(error) {
    console.warn('🚨', chainId, address, '!activation field')
    const createBlock = await estimateCreationBlock(chainId, address)
    return {
      activationBlockTime: createBlock.timestamp,
      activationBlockNumber: createBlock.number
    }
  }
}

export async function extractFees(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const bps = await extractFeesBps(chainId, address, blockNumber)
  return {
    performance: math.div(bps.performance, 10_000n),
    management: math.div(bps.management, 10_000n)
  }
}

export async function extractFeesBps(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const multicallResult = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
    {
      address, functionName: 'performanceFee',
      abi: parseAbi(['function performanceFee() returns (uint256)'])
    },
    {
      address, functionName: 'managementFee',
      abi: parseAbi(['function managementFee() returns (uint256)'])
    }
  ], blockNumber })

  return {
    performance: multicallResult[0].result || 0n,
    management: multicallResult[1].result || 0n
  }
}

export async function extractWithdrawalQueue(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const results = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
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
  ], blockNumber})

  return results.filter(result => result.status === 'success' && result.result && result.result !== zeroAddress)
  .map(result => result.result as `0x${string}`)
}
