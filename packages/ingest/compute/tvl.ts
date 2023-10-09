import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'
import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { estimateHeight, getBlock } from 'lib/blocks'
import db from '../db'
import { parseAbi } from 'viem'
import { fetchErc20PriceUsd } from 'lib/prices'

export class TvlComputer implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
  }

  async down() {
    await this.queue?.close()
  }

  async compute(data: any) {
    const { chainId, address, time } = data

    const blockNumber = await estimateHeight(chainId, time)
    const block = await getBlock(chainId, blockNumber)
    const { assetAddress, decimals } = await getAsset(chainId, address)

    const totalAssets = await rpcs.next(chainId).readContract({
      address,
      functionName: 'totalAssets' as never,
      abi: parseAbi(['function totalAssets() view returns (uint256)']),
      blockNumber
    }) as bigint

    const { price: assetPriceUsd } = await fetchErc20PriceUsd(chainId, assetAddress, blockNumber)
    const tvlAssets = Number(totalAssets * 10_000n / BigInt(10 ** decimals)) / 10_000
    const tvlUsd = tvlAssets * assetPriceUsd

    await this.queue?.add(mq.job.load.tvl, {
      chainId,
      address,
      tvlUsd,
      blockNumber,
      blockTime: block.timestamp.toString()
    } as types.TVL)
  }
}

export async function getAsset(chainId: number, address: string) {
  const result = await db.query(`
    SELECT 
      asset_address as "assetAddress",
      decimals
    FROM vault
    WHERE chain_id = $1 AND address = $2
  `, [chainId, address])
  return result.rows[0] as {
    assetAddress: `0x${string}`, 
    decimals: number
  }
}