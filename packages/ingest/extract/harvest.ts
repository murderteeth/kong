import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'
import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import db from '../db'
import { fetchErc20PriceUsd } from 'lib/prices'
import { parseAbi } from 'viem'
import { getBlock } from 'lib/blocks'

export class HarvestExtractor implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async extract(data: any) {
    let harvest = data as types.Harvest

    const block = await getBlock(harvest.chainId, BigInt(harvest.blockNumber))
    const asset = await getAsset(harvest.chainId, harvest.address)
    if(!asset) { 
      console.warn('🚨', 'no asset', harvest.chainId, harvest.address)
      return
    }

    const { price } = await fetchErc20PriceUsd(harvest.chainId, asset.address, BigInt(harvest.blockNumber))
    const profitUsd = price * Number(BigInt(harvest.profit) * 10_000n / BigInt(10 ** Number(asset.decimals))) / 10_000
    const lossUsd = price * Number(BigInt(harvest.loss) * 10_000n / BigInt(10 ** Number(asset.decimals))) / 10_000
    const totalProfitUsd = price * Number(BigInt(harvest.totalProfit) * 10_000n / BigInt(10 ** Number(asset.decimals))) / 10_000
    const totalLossUsd = price * Number(BigInt(harvest.totalLoss) * 10_000n / BigInt(10 ** Number(asset.decimals))) / 10_000

    harvest = {
      ...harvest,
      profitUsd,
      lossUsd,
      totalProfitUsd,
      totalLossUsd,
      blockTime: block.timestamp
    }

    await this.queues[mq.q.load].add(mq.job.load.harvest, { batch: [harvest] })
  }
}

export async function getAsset(chainId: number, address: `0x${string}`) {
  const result = await db.query(`
    SELECT 
      asset_address as address,
      decimals,
      'db' as source
    FROM vault
    WHERE chain_id = $1 AND address = $2
    UNION SELECT
      v.asset_address as address,
      v.decimals,
      'db' as source
    FROM vault v
    JOIN strategy s ON s.vault_address = v.address
    WHERE s.chain_id = $1 AND s.address = $2
  `, [chainId, address])
  if(result.rows.length > 0) {
    return result.rows[0] as {
      address: `0x${string}`, 
      decimals: number,
      source: string
    }
  }

  const want = await rpcs.next(chainId).readContract({
    address, 
    functionName: 'want' as never,
    abi: parseAbi(['function want() returns (address)'])
  }) as `0x${string}`

  if(want) {
    const decimals = await rpcs.next(chainId).readContract({
      address: want,
      functionName: 'decimals' as never,
      abi: parseAbi(['function decimals() returns (uint256)'])
    }) as number
    return {
      address: want,
      decimals: Number(decimals),
      source: 'rpc'
    }
  }

  return null
}
