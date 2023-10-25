import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'
import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { estimateHeight, getBlock } from 'lib/blocks'
import db from '../db'
import { parseAbi } from 'viem'
import { fetchErc20PriceUsd } from 'lib/prices'
import { extractDelegatedAssets, extractWithdrawalQueue } from '../extract/vault'
import { scaleDown } from 'lib/math'
import { endOfDay } from 'lib/dates'

export class TvlComputer implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
  }

  async down() {
    await this.queue?.close()
  }

  async compute({ chainId, address, time }
    : { chainId: number, address: `0x${string}`, time: bigint })
  {
    let number: bigint = 0n
    let timestamp: bigint = 0n
    if(time > BigInt((new Date()).getTime() * 1000)) {
      ({ number, timestamp } = await rpcs.next(chainId).getBlock())
    } else {
      const estimate = await estimateHeight(chainId, time);
      ({ number, timestamp } = await getBlock(chainId, estimate))
    }

    const tvlUsd = await _compute(chainId, address, timestamp)
    const artificialBlockTime = endOfDay(time)

    await this.queue?.add(mq.job.load.tvl, {
      chainId,
      address,
      tvlUsd,
      blockNumber: number,
      blockTime: artificialBlockTime
    } as types.TVL)
  }
}

export async function _compute(chainId: number, address: `0x${string}`, time: bigint) {
  const blockNumber = await estimateHeight(chainId, time)
  const { assetAddress, decimals } = await getAsset(chainId, address)

  const totalAssets = await rpcs.next(chainId).readContract({
    address,
    functionName: 'totalAssets' as never,
    abi: parseAbi(['function totalAssets() view returns (uint256)']),
    blockNumber
  }) as bigint

  if(totalAssets === 0n) return 0

  const strategies = await extractWithdrawalQueue(chainId, address, blockNumber)
  const delegatedAssets = await extractDelegatedAssets(chainId, strategies, blockNumber)
  const totalDelegatedAssets = delegatedAssets.reduce((acc, { delegatedAssets }) => acc + delegatedAssets, 0n)
  const { price: assetPriceUsd } = await fetchErc20PriceUsd(chainId, assetAddress, blockNumber)

  return (scaleDown(totalAssets, decimals) - scaleDown(totalDelegatedAssets, decimals)) 
  * assetPriceUsd 
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
