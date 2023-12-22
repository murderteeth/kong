import { blocks, math, mq, types } from 'lib'
import { rpcs } from '../../rpcs'
import { parseAbi, zeroAddress } from 'viem'
import { estimateCreationBlock } from 'lib/blocks'
import { Processor } from 'lib/processor'
import { Queue } from 'bullmq'
import db, { firstRow } from '../../db'

export class VaultExtractor__v3 implements Processor {
  queues: { [name: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(queue => queue.close()))
  }

  async extract(vault: types.Vault, asOfBlockNumber: bigint) {
    const registration = await getRegistration(vault) ?? await extractRegistration(vault)
    const fields = await extractFields(vault)
    const fees = await extractFeesBps({...vault, ...fields} as types.Vault)
    const asset = await getAsset(vault) ?? await extractAsset(vault.chainId, fields.assetAddress as `0x${string}`)
    const defaultQueue = await extractDefaultQueue({...vault, ...registration})

    const update = types.VaultSchema.safeParse({
      ...vault,
      ...registration,
      ...fields,
      ...fees,
      ...asset,
      asOfBlockNumber
    })

    if(!update.success) throw new Error(update.error.errors.join(', '))

    await this.queues[mq.q.load].add(mq.job.load.erc20, {
      chainId: vault.chainId,
      address: fields.assetAddress,
      name: asset.assetName,
      symbol: asset.assetSymbol,
      decimals: fields.decimals
    })

    await this.queues[mq.q.load].add(mq.job.load.erc20, {
      chainId: vault.chainId,
      address: vault.address,
      name: fields.name,
      symbol: fields.symbol,
      decimals: fields.decimals
    })

    await this.queues[mq.q.load].add(mq.job.load.vault, update.data)

    await this.queues[mq.q.load].add(mq.job.load.withdrawalQueue,
      { batch: defaultQueue.map((strategyAddress, queueIndex) => ({
        chainId: vault.chainId,
        vaultAddress: vault.address,
        queueIndex, strategyAddress, asOfBlockNumber
      })) as types.WithdrawalQueueItem[]
    })
  }
}

export async function getRegistration(vault: types.Vault) {
  return await firstRow(
    `SELECT type, activation_block_time as "activationBlockTime", activation_block_number as "activationBlockNumber"
    FROM vault WHERE chain_id = $1 AND address = $2`,
    [vault.chainId, vault.address]
  )
}

export async function extractRegistration(vault: types.Vault, blockNumber?: bigint) {
  if(!vault.registryAddress) throw new Error('!vault.registryAddress')
  const [asset, releaseVersion, vaultType, deploymentTimestamp, tag] = await rpcs.next(vault.chainId, blockNumber).readContract({
    address: vault.registryAddress as `0x${string}`,
    abi: parseAbi(['function vaultInfo(address) view returns (address, uint96, uint128, uint128, string)']),
    functionName: 'vaultInfo',
    args: [vault.address],
    blockNumber
  })

  return { 
    type: Number(vaultType) === 1 ? 'vault' : 'strategy', 
    activationBlockTime: deploymentTimestamp,
    activationBlockNumber: await blocks.estimateHeight(vault.chainId, deploymentTimestamp)
  } as types.Vault
}

export async function extractFields(vault: types.Vault, blockNumber?: bigint) {
  const multicallResult = await rpcs.next(vault.chainId, blockNumber).multicall({ contracts: [
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
      address: vault.address, functionName: 'asset',
      abi: parseAbi(['function asset() returns (address)'])
    },
    {
      address: vault.address, functionName: 'totalAssets',
      abi: parseAbi(['function totalAssets() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'totalDebt',
      abi: parseAbi(['function totalDebt() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'totalIdle',
      abi: parseAbi(['function totalIdle() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'minimum_total_idle',
      abi: parseAbi(['function minimum_total_idle() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'profitMaxUnlockTime',
      abi: parseAbi(['function profitMaxUnlockTime() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'profitUnlockingRate',
      abi: parseAbi(['function profitUnlockingRate() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'fullProfitUnlockDate',
      abi: parseAbi(['function fullProfitUnlockDate() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'lastProfitUpdate',
      abi: parseAbi(['function lastProfitUpdate() returns (uint256)'])
    },    
    {
      address: vault.address, functionName: 'deposit_limit',
      abi: parseAbi(['function deposit_limit() returns (uint256)'])
    },
    {
      address: vault.address, functionName: 'accountant',
      abi: parseAbi(['function accountant() returns (address)'])
    },
    {
      address: vault.address, functionName: 'role_manager',
      abi: parseAbi(['function role_manager() returns (address)'])
    },
    {
      address: vault.address, functionName: 'isShutdown',
      abi: parseAbi(['function isShutdown() returns (bool)'])
    }
  ], blockNumber })

  return {
    name: multicallResult[0].result,
    symbol: multicallResult[1].result,
    decimals: multicallResult[2].result,
    assetAddress: multicallResult[3].result,
    totalAssets: multicallResult[4].result,
    totalDebt: multicallResult[5].result,
    totalIdle: multicallResult[6].result,
    minimumTotalIdle: multicallResult[7].result,
    profitMaxUnlockTime: multicallResult[8].result,
    profitUnlockingRate: multicallResult[9].result,
    fullProfitUnlockDate: multicallResult[10].result,
    lastProfitUpdate: multicallResult[11].result,
    depositLimit: multicallResult[12].result,
    accountant: multicallResult[13].result,
    roleManager: multicallResult[14].result,
    isShutdown: multicallResult[15].result
  } as types.Vault
}

export async function extractFees(vault: types.Vault, blockNumber?: bigint) {
  const feesBps = await extractFeesBps(vault, blockNumber)
  return {
    managementFee: feesBps.managementFee / 10_000,
    performanceFee: feesBps.performanceFee / 10_000
  }
}

export async function extractFeesBps(vault: types.Vault, blockNumber?: bigint) {
  if(vault.accountant) {
    const defaultConfig = await rpcs.next(vault.chainId, blockNumber).readContract({
      address: vault.accountant,
      abi: parseAbi(['function defaultConfig() view returns (uint16, uint16, uint16, uint16, uint16, uint16)']),
      functionName: 'defaultConfig',
      blockNumber
    })
    return {
      managementFee: defaultConfig[0],
      performanceFee: defaultConfig[1]
    }
  } else {
    const performanceFee = await rpcs.next(vault.chainId, blockNumber).readContract({
      address: vault.address,
      abi: parseAbi(['function performanceFee() view returns (uint16)']),
      functionName: 'performanceFee',
      blockNumber
    })
    return {
      managementFee: 0,
      performanceFee: performanceFee
    }
  }
}

export async function getAsset(vault: types.Vault) {
  return await firstRow(
    `SELECT asset_name as "assetName", asset_symbol as "assetSymbol"
    FROM vault WHERE chain_id = $1 AND address = $2`,
    [vault.chainId, vault.address]
  )
}

export async function extractAsset(chainId: number, address: `0x${string}`, blockNumber?: bigint) {
  const result = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
    {
      address, functionName: 'name',
      abi: parseAbi(['function name() view returns (string)'])
    },
    {
      address, functionName: 'symbol',
      abi: parseAbi(['function symbol() view returns (string)'])
    }
  ], blockNumber })

  return {
    assetName: result[0].result,
    assetSymbol: result[1].result
  }
}

export async function extractDefaultQueue(vault: types.Vault, blockNumber?: bigint) {
  if(vault.type === 'strategy') return []
  return await rpcs.next(vault.chainId, blockNumber).readContract({
    address: vault.address,
    abi: parseAbi(['function get_default_queue() view returns (address[])']),
    functionName: 'get_default_queue',
    blockNumber
  })
}
