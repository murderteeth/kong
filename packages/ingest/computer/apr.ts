import { math, types } from "lib"
import db from "../db"
import { rpcs } from "lib/rpcs"
import { parseAbi } from "viem"

export async function compute(latest: types.Harvest) {
  const query = `
    SELECT 
      total_profit as "totalProfit",
      total_loss as "totalLoss",
      block_timestamp as "blockTimestamp"
    FROM harvest 
    WHERE chain_id = $1 AND address = $2 AND block_number < $3
    ORDER BY block_number desc
    LIMIT 1`
  const [ previous ] = (await db.query(query, [latest.chainId, latest.address, latest.blockNumber])).rows as types.Harvest[]
  if(!previous) return { gross: 0.0, net: 0.0 }
  if(!latest.totalDebt || BigInt(latest.totalDebt) === BigInt(0)) return { gross: 0.0, net: 0.0 }

  const profit = BigInt(latest.totalProfit || 0) - BigInt(previous.totalProfit || 0)
  const loss = BigInt(latest.totalLoss || 0) - BigInt(previous.totalLoss || 0)

  const performance = (loss > profit)
  ? math.div(-loss, BigInt(latest.totalDebt))
  : math.div(profit, BigInt(latest.totalDebt))

  const periodInHours = Number((BigInt(latest.blockTimestamp) - BigInt(previous.blockTimestamp)) / BigInt(60 * 60)) || 1
  const hoursInOneYear = 24 * 365
  const gross = performance * hoursInOneYear / periodInHours

  const { vault, delegatedAssets } = await getStrategyInfo(latest.chainId, latest.address, BigInt(latest.blockNumber))
  const fees = await getFees(latest.chainId, vault, BigInt(latest.blockNumber))
  const ratioOfDelegatedAssets = math.div(BigInt(delegatedAssets), BigInt(latest.totalDebt))
  const net = gross * (1 - fees.performance) - (fees.management * (1 - ratioOfDelegatedAssets))

  return { gross, net }
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
