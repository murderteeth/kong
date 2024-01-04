import { math, mq, multicall3, types } from 'lib'
import db, { firstValue, some } from '../db'
import { rpcs } from '../rpcs'
import { parseAbi } from 'viem'
import { Processor } from 'lib/processor'
import { Queue } from 'bullmq'
import { getBlock } from 'lib/blocks'
import { extractFees } from '../extract/vault/version2'
import { compare } from 'compare-versions'
import { HarvestSchema } from 'lib/types'

export class HarvestAprComputer implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
  }

  async down() {
    await this.queue?.close()
  }

  async compute(data: any) {
    const { chainId, address, blockNumber, blockIndex } = data as { chainId: number, address: `0x${string}`, blockNumber: bigint, blockIndex: number }

    if(!multicall3.supportsBlock(chainId, BigInt(blockNumber))) {
      console.warn('🚨', 'block not supported', chainId, blockNumber)
      return
    }

    const [ latest, previous ] = await getHarvests(chainId, address, blockNumber)
    if(!(latest && previous)) return

    const handler = await getHandler(chainId, address)
    const apr = await handler.compute(latest, previous)

    const block = await getBlock(chainId, apr.blockNumber)
    await this.queue?.add(mq.job.load.apr, {
      chainId: chainId,
      address: address,
      gross: apr.gross,
      net: apr.net,
      blockNumber: apr.blockNumber,
      blockTime: block.timestamp
    } as types.APR, {
      jobId: `${chainId}-${address}-${blockNumber}-${blockIndex}-harvest-apr`
    })
  }
}

export async function getHandler(chainId: number, address: `0x${string}`) {
  if(await some('SELECT * FROM strategy WHERE chain_id = $1 AND address = $2', [chainId, address])) {
    return { name: 'v2', compute: compute__v2 }
  } else {
    const apiVersion = await firstValue<string>('SELECT api_version as "apiVersion" FROM vault WHERE chain_id = $1 AND address = $2', [chainId, address])
    if(apiVersion == null) throw new Error(`missing strategy ${chainId}/${address}`)
    if(compare(apiVersion, '3.0.0', '>=')) {
      return { name: 'v3', compute: compute__v3 }
    } else {
      throw new Error(`unsupported api version ${apiVersion}`)
    }
  }
}

export async function totalDebt(harvest: types.Harvest) {
  try {
    return await rpcs.next(harvest.chainId, harvest.blockNumber).readContract({
      address: harvest.address,
      functionName: 'totalDebt',
      abi: parseAbi(['function totalDebt() view returns (uint256)']),
      blockNumber: harvest.blockNumber
    }) as bigint
  } catch(error) {
    return 0n
  }
}

export async function compute__v3(latest: types.Harvest, previous: types.Harvest) {
  const latestDebt = await totalDebt(latest)
  const previousDebt = await totalDebt(previous)

  if(!(latestDebt && previousDebt)) return { 
    gross: 0, net: 0, blockNumber: latest.blockNumber 
  }

  const profit = latest.profit
  const loss = latest.loss
  const fees = (latest.performanceFees ?? 0n) + (latest.protocolFees ?? 0n)

  const grossPerformance = (loss > profit)
  ? math.div(-loss, previousDebt)
  : math.div(profit, previousDebt)

  const netPerformance = (loss > profit)
  ? math.div(-loss, previousDebt)
  : math.div(math.max(profit - fees, 0n), previousDebt)

  const periodInHours = Number(((latest.blockTime || 0n) - (previous.blockTime || 0n)) / (60n * 60n)) || 1
  const hoursInOneYear = 24 * 365
  const gross = grossPerformance * hoursInOneYear / periodInHours
  const net = netPerformance * hoursInOneYear / periodInHours

  return { gross, net, blockNumber: latest.blockNumber }
}

export async function compute__v2(latest: types.Harvest, previous: types.Harvest) {
  if(!(latest.totalDebt && previous.totalDebt)) return { 
    gross: 0, net: 0, blockNumber: latest.blockNumber 
  }

  const profit = (latest.totalProfit || 0n) - (previous.totalProfit || 0n)
  const loss = (latest.totalLoss || 0n) - (previous.totalLoss || 0n)

  const performance = (loss > profit)
  ? math.div(-loss, previous.totalDebt)
  : math.div(profit, previous.totalDebt)

  const periodInHours = Number(((latest.blockTime || 0n) - (previous.blockTime || 0n)) / (60n * 60n)) || 1
  const hoursInOneYear = 24 * 365
  const gross = performance * hoursInOneYear / periodInHours

  if(gross < 0) return { gross, net: gross, blockNumber: latest.blockNumber }

  const { vault, delegatedAssets } = await getStrategyInfo(latest.chainId, latest.address, latest.blockNumber)

  const fees = await extractFees(latest.chainId, vault, latest.blockNumber)

  const ratioOfDelegatedAssets = math.div(BigInt(delegatedAssets), BigInt(previous.totalDebt))
  const net = gross * (1 - fees.performance) - (fees.management * (1 - ratioOfDelegatedAssets))

  return { gross, net, blockNumber: latest.blockNumber }
}

async function getHarvests(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const query = `
    SELECT
      chain_id as "chainId",
      address as "address",
      COALESCE(profit, 0) as "profit",
      COALESCE(loss, 0) as "loss",
      COALESCE(total_profit, 0) as "totalProfit",
      COALESCE(total_loss, 0) as "totalLoss",
      COALESCE(total_debt, 0) as "totalDebt",
      COALESCE(protocol_fees, 0) as "protocolFees",
      COALESCE(performance_fees, 0) as "performanceFees",
      block_number as "blockNumber",
      block_time as "blockTime",
      block_index as "blockIndex",
      transaction_hash as "transactionHash"
    FROM harvest 
    WHERE chain_id = $1 AND address = $2 AND block_number <= $3
    ORDER BY block_number desc
    LIMIT 2`
  const result = await db.query(query, [chainId, address, blockNumber])
  return HarvestSchema.array().parse(result.rows)
}

async function getStrategyInfo(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const multicallResult = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
    {
      address, functionName: 'vault',
      abi: parseAbi(['function vault() returns (address)'])
    },
    {
      address, functionName: 'delegatedAssets',
      abi: parseAbi(['function delegatedAssets() returns (uint256)'])
    }
  ], blockNumber })

  return {
    vault: multicallResult[0].result as `0x${string}`,
    delegatedAssets: (multicallResult[1].result || 0n) as bigint
  }
}
