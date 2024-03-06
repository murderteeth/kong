import { z } from 'zod'
import { parseAbi, zeroAddress } from 'viem'
import { rpcs } from '../../../../../rpcs'
import { ThingSchema, zhexstring } from 'lib/types'
import { mq } from 'lib'
import { estimateCreationBlock } from 'lib/blocks'
import db from '../../../../../db'

export const SnapshotSchema = z.object({
  accountant: zhexstring.optional(),
  totalDebt: z.bigint({ coerce: true })
})

type Snapshot = z.infer<typeof SnapshotSchema>

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const snapshot = SnapshotSchema.parse(data)
  const fees = await extractFeesBps(chainId, address, snapshot)
  const debts = await extractDebts(chainId, address, snapshot)

  if (snapshot.accountant) {
    const incept = await estimateCreationBlock(chainId, snapshot.accountant)
    await mq.add(mq.q.load, mq.job.load.thing, ThingSchema.parse({
      chainId,
      address: snapshot.accountant,
      label: 'accountant',
      defaults: {
        inceptBlock: incept.number,
        inceptTime: incept.timestamp
      }
    }))
  }

  return { fees, debts }
}

export async function extractDebts(chainId: number, vault: `0x${string}`, snapshot: Snapshot) {
  const results: {
    strategy: `0x${string}`,
    currentDebt: bigint,
    maxDebt: bigint,
    targetDebtRatio: number | undefined,
    maxDebtRatio: number | undefined
  }[] = []

  const defaults = await db.query(
    `SELECT 
      defaults->'strategies' AS strategies,
      defaults->'debtAllocator' AS "debtAllocator"
    FROM thing 
    WHERE chain_id = $1 AND address = $2 AND label = $3`,
    [chainId, vault, 'vault']
  )

  const { strategies, debtAllocator } = z.object({
    strategies: zhexstring.array().optional(),
    debtAllocator: zhexstring.optional()
  }).parse(defaults.rows[0])

  if(strategies) {
    for (const strategy of strategies) {
      const multicall = await rpcs.next(chainId).multicall({ contracts: [
        {
          address: vault, functionName: 'strategies', args: [strategy],
          abi: parseAbi(['function strategies(address) view returns (uint256, uint256, uint256, uint256)'])
        },
        {
          address: debtAllocator || zeroAddress, functionName: 'getStrategyTargetRatio', args: [strategy],
          abi: parseAbi(['function getStrategyTargetRatio(address) view returns (uint256)'])
        }, 
        {
          address: debtAllocator || zeroAddress, functionName: 'getStrategyMaxRatio', args: [strategy],
          abi: parseAbi(['function getStrategyMaxRatio(address) view returns (uint256)'])
        }
      ]})

      if(multicall.some(result => result.status !== 'success')) throw new Error('!multicall.success')
      const [activation, lastReport, currentDebt, maxDebt] = multicall[0].result!
      const targetDebtRatio = debtAllocator ? Number(multicall[1].result!) : undefined
      const maxDebtRatio = debtAllocator ? Number(multicall[2].result!) : undefined

      results.push({
        strategy,
        currentDebt,
        maxDebt,
        targetDebtRatio,
        maxDebtRatio
      })
    }
  }

  return results
}

export async function extractFeesBps(chainId: number, address: `0x${string}`, snapshot: Snapshot) {
  if(snapshot.accountant && snapshot.accountant !== zeroAddress) {
    const defaultConfig = await rpcs.next(chainId).readContract({
      address: snapshot.accountant,
      abi: parseAbi(['function defaultConfig() view returns (uint16, uint16, uint16, uint16, uint16, uint16)']),
      functionName: 'defaultConfig'
    })
    return {
      managementFee: defaultConfig[0],
      performanceFee: defaultConfig[1]
    }
  } else {
    const performanceFee = await rpcs.next(chainId).readContract({
      address,
      abi: parseAbi(['function performanceFee() view returns (uint16)']),
      functionName: 'performanceFee'
    })
    return {
      managementFee: 0,
      performanceFee: performanceFee
    }
  }
}
