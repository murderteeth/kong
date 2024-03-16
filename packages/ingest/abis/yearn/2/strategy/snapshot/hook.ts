import { z } from 'zod'
import { ContractFunctionExecutionError, getAddress, parseAbi, zeroAddress } from 'viem'
import { ThingSchema, Tradeable, TradeableSchema, zhexstring } from 'lib/types'
import { fetchErc20PriceUsd } from '../../../../../prices'
import { priced } from 'lib/math'
import { rpcs } from '../../../../../rpcs'
import * as things from '../../../../../things'
import { mq } from 'lib'
import { estimateCreationBlock } from 'lib/blocks'
import { fetchOrExtractErc20 } from '../../../lib'
import db from '../../../../../db'
import { getRiskScore } from '../../../lib/risk'
import { getStrategyMeta } from '../../../lib/meta'

const borkedVaults = [
  '0x718AbE90777F5B778B52D553a5aBaa148DD0dc5D'
]

const SnapshotSchema = z.object({
  vault: zhexstring,
  want: zhexstring,
  totalDebt: z.bigint({ coerce: true }).optional(),
  tradeFactory: zhexstring
})

export type Snapshot = z.infer<typeof SnapshotSchema>

const RewardSchema = z.object({
  token: z.string(),
  balance: z.bigint(),
  balanceUsd: z.number()
})

export type Reward = z.infer<typeof RewardSchema>

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const snapshot = SnapshotSchema.parse(data)
  await processTradeFactory(chainId, snapshot)
  const totalDebtUsd = await computeTotalDebtUsd(chainId, snapshot)
  const lenderStatuses = await extractLenderStatuses(chainId, address)
  const rewards = await computeRewards(chainId, address, snapshot)
  const risk = await getRiskScore(chainId, address)
  const meta = await getStrategyMeta(chainId, address)
  return { totalDebtUsd, lenderStatuses, rewards, risk, meta }
}

async function processTradeFactory(chainId: number, snapshot: Snapshot) {
  if (!snapshot.tradeFactory || snapshot.tradeFactory === zeroAddress) return
  if (await things.exist(chainId, snapshot.tradeFactory, 'tradeFactory')) return

  const block = await estimateCreationBlock(chainId, snapshot.tradeFactory)
  const inceptBlock = block.number
  const inceptTime = block.timestamp
  await mq.add(mq.job.load.thing, ThingSchema.parse({
    chainId,
    address: snapshot.tradeFactory,
    label: 'tradeHandler',
    defaults: { inceptBlock, inceptTime }
  }))
}

async function computeTotalDebtUsd(chainId: number, snapshot: Snapshot) {
  if (borkedVaults.includes(getAddress(snapshot.vault))) return 0
  if (snapshot.want === zeroAddress) return 0
  if (!snapshot.totalDebt) return 0
  const { priceUsd } = await fetchErc20PriceUsd(chainId, snapshot.want)
  const erc20 = await fetchOrExtractErc20(chainId, snapshot.want)
  return priced(snapshot.totalDebt, erc20.decimals, priceUsd)
}

export async function extractLenderStatuses(chainId: number, address: `0x${string}`, blockNumber?: bigint) {
  try {
    return (await rpcs.next(chainId, blockNumber).readContract({
      address, functionName: 'lendStatuses', 
      abi: parseAbi([
        'struct lendStatus { string name; uint256 assets; uint256 rate; address add; }',
        'function lendStatuses() view returns (lendStatus[])'
      ]),
      blockNumber
    })).map(status => ({
      name: status.name,
      assets: status.assets,
      rate: status.rate,
      address: status.add
    }))

  } catch(error) {
    if(error instanceof ContractFunctionExecutionError) return []
    throw error

  }
}

async function computeRewards(chainId: number, strategy: `0x${string}`, snapshot: Snapshot) {
  if (!snapshot.tradeFactory || snapshot.tradeFactory === zeroAddress) return []
  const tradeables = await fetchTradeables(chainId, strategy, snapshot.tradeFactory)
  const balances = await extractBalances(chainId, strategy, tradeables)

  const result: Reward[] = []

  for (const [i, t] of tradeables.entries()) {
    const { priceUsd } = await fetchErc20PriceUsd(chainId, t.token)
    result.push({
      token: t.token,
      balance: balances[i],
      balanceUsd: priced(balances[i], t.decimals, priceUsd)
    })
  }

  return RewardSchema.array().parse(result)
}

async function fetchTradeables(chainId: number, strategy: `0x${string}`, tradeHandler: `0x${string}`) {
  const result = await db.query(`
    SELECT hook->'tradeables' as tradeables FROM snapshot WHERE chain_id = $1 AND address = $2`, 
    [chainId, tradeHandler]
  )
  if (result.rows.length === 0) return []
  const tradeables = TradeableSchema.array().parse(result.rows[0].tradeables || [])
  return tradeables.filter(t => t.strategy === strategy)
}

async function extractBalances(chainId: number, strategy: `0x${string}`, tradeables: Tradeable[]) {
  const contracts = tradeables.map(t => ({ 
    address: t.token, functionName: 'balanceOf', args: [strategy],
    abi: parseAbi(['function balanceOf(address) view returns (uint256)'])
  }))

  const multicall = await rpcs.next(chainId).multicall({ contracts })
  if(multicall.some(result => result.status !== 'success')) throw new Error('!multicall.success')
  return tradeables.map((t, i) => multicall[i].result!)
}
