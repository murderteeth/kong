import { math, mq, multicall3, types } from 'lib'
import db from '../db'
import { rpcs } from 'lib/rpcs'
import { parseAbi } from 'viem'
import { Processor } from 'lib/processor'
import { Queue } from 'bullmq'
import { getBlock } from 'lib/blocks'

export class HarvestAprComputer implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
  }

  async down() {
    await this.queue?.close()
  }

  async compute(data: any) {
    const { chainId, address, blockNumber, blockIndex } = data as { chainId: number, address: `0x${string}`, blockNumber: string, blockIndex: number }

    if(!multicall3.supportsBlock(chainId, BigInt(blockNumber))) {
      console.warn('🚨', 'block not supported', chainId, blockNumber)
      return
    }

    const apr = await computeHarvestApr(chainId, address, BigInt(blockNumber))
    if(apr === null) return

    const block = await getBlock(chainId, BigInt(apr.blockNumber))
    await this.queue?.add(mq.job.load.apr, {
      chainId: chainId,
      address: address,
      gross: apr.gross,
      net: apr.net,
      blockNumber: apr.blockNumber,
      blockTime: block.timestamp.toString()
    } as types.APR, {
      jobId: `${chainId}-${blockNumber}-${blockIndex}-harvest-apr`
    })
  }
}

export async function computeHarvestApr(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const query = `
    SELECT 
      total_profit as "totalProfit",
      total_loss as "totalLoss",
      total_debt as "totalDebt",
      block_number as "blockNumber",
      FLOOR(EXTRACT(EPOCH FROM block_time)) as "blockTime"
    FROM harvest 
    WHERE chain_id = $1 AND address = $2 AND block_number <= $3
    ORDER BY block_number desc
    LIMIT 2`
  const [ latest, previous ] = (await db.query(query, [chainId, address, blockNumber])).rows as types.Harvest[]
  if(!(latest && previous)) return null
  if(!latest.totalDebt || BigInt(latest.totalDebt) === BigInt(0)) return null

  const profit = BigInt(latest.totalProfit || 0) - BigInt(previous.totalProfit || 0)
  const loss = BigInt(latest.totalLoss || 0) - BigInt(previous.totalLoss || 0)

  const performance = (loss > profit)
  ? math.div(-loss, BigInt(latest.totalDebt))
  : math.div(profit, BigInt(latest.totalDebt))

  const periodInHours = Number((BigInt(latest.blockTime) - BigInt(previous.blockTime)) / BigInt(60 * 60)) || 1
  const hoursInOneYear = 24 * 365
  const gross = performance * hoursInOneYear / periodInHours

  const { vault, delegatedAssets } = await getStrategyInfo(chainId, address, BigInt(latest.blockNumber))
  const fees = await getFees(chainId, vault, BigInt(latest.blockNumber))
  const ratioOfDelegatedAssets = math.div(BigInt(delegatedAssets), BigInt(latest.totalDebt))
  const net = gross * (1 - fees.performance) - (fees.management * (1 - ratioOfDelegatedAssets))

  return { gross, net, blockNumber: latest.blockNumber }
}

async function getStrategyInfo(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const multicallResult = await rpcs.next(chainId).multicall({ contracts: [
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
    delegatedAssets: multicallResult[1].result as bigint
  }
}

async function getFees(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const multicallResult = await rpcs.next(chainId).multicall({ contracts: [
    {
      address, functionName: 'performanceFees',
      abi: parseAbi(['function performanceFees() returns (uint256)'])
    },
    {
      address, functionName: 'managementFees',
      abi: parseAbi(['function managementFees() returns (uint256)'])
    }
  ], blockNumber })

  return {
    performance: math.div((multicallResult[0].result || 0n) as bigint, 10_000n),
    management: math.div((multicallResult[1].result || 0n) as bigint, 10_000n)
  }
}
