import { math, mq, multicall3, types } from 'lib'
import db from '../db'
import { rpcs } from '../rpcs'
import { parseAbi } from 'viem'
import { Processor } from 'lib/processor'
import { Queue } from 'bullmq'
import { getBlock } from 'lib/blocks'
import { extractFees } from '../extract/vault/version2'

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

    const apr = await _compute(latest, previous)

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

export async function _compute(latest: types.Harvest, previous: types.Harvest) {
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
      COALESCE(total_profit, 0) as "totalProfit",
      COALESCE(total_loss, 0) as "totalLoss",
      COALESCE(total_debt, 0) as "totalDebt",
      block_number as "blockNumber",
      FLOOR(EXTRACT(EPOCH FROM block_time)) as "blockTime"
    FROM harvest 
    WHERE chain_id = $1 AND address = $2 AND block_number <= $3
    ORDER BY block_number desc
    LIMIT 2`
  const result = await db.query(query, [chainId, address, blockNumber])
  return result.rows.map(row => ({
    chainId,
    address,
    totalProfit: BigInt(row.totalProfit),
    totalLoss: BigInt(row.totalLoss),
    totalDebt: BigInt(row.totalDebt),
    blockNumber: BigInt(row.blockNumber),
    blockTime: BigInt(row.blockTime)
  })) as types.Harvest[]
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
