import { Processor } from 'lib/processor'
import { rpcs } from '../rpcs'
import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { estimateHeight, getBlock } from 'lib/blocks'
import db from '../db'
import { parseAbi } from 'viem'
import { fetchErc20PriceUsd } from 'lib/prices'
import { extractWithdrawalQueue } from '../extract/vault/version2'
import { scaleDown } from 'lib/math'
import { endOfDay } from 'lib/dates'
import { extractDelegatedAssets } from '../extract/strategy'
import { MeasureSchema, TVLSchema } from 'lib/types'

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
    let blockNumber: bigint = 0n
    let latest: boolean = false
    if(time >= BigInt(Math.floor(new Date().getTime() / 1000))) {
      latest = true;
      ({ number: blockNumber } = await getBlock(chainId))
    } else {
      const estimate = await estimateHeight(chainId, time);
      ({ number: blockNumber } = await getBlock(chainId, estimate))
    }

    const { priceUsd, source: priceSource, tvl: tvlUsd } = await _compute(chainId, address, blockNumber, latest)
    const artificialBlockTime = endOfDay(time)

    await this.queue?.add(mq.job.load.tvl, TVLSchema.parse({
      chainId,
      address,
      priceUsd,
      priceSource,
      tvlUsd,
      blockNumber,
      blockTime: artificialBlockTime
    }))

    {
      await this.queue?.add(mq.job.load.measure, MeasureSchema.parse({
        chainId, address, blockNumber, blockTime: artificialBlockTime, label: 'tvl', component: 'usd', value: tvlUsd
      }))
      await this.queue?.add(mq.job.load.measure, MeasureSchema.parse({
        chainId, address, blockNumber, blockTime: artificialBlockTime, label: 'price', component: priceSource, value: priceUsd
      }))
    }
  }
}

export async function _compute(chainId: number, address: `0x${string}`, blockNumber: bigint, latest = false) {
  const { assetAddress, decimals } = await getAsset(chainId, address)
  const { priceUsd, priceSource: source } = await fetchErc20PriceUsd(chainId, assetAddress, blockNumber, latest)

  const totalAssets = await rpcs.next(chainId, blockNumber).readContract({
    address,
    functionName: 'totalAssets',
    abi: parseAbi(['function totalAssets() view returns (uint256)']),
    blockNumber
  }) as bigint

  if(totalAssets === 0n) return { priceUsd, source, tvl: 0 }

  const strategies = await extractWithdrawalQueue(chainId, address, blockNumber)
  const delegatedAssets = await extractDelegatedAssets(chainId, strategies, blockNumber)
  const totalDelegatedAssets = delegatedAssets.reduce((acc, { delegatedAssets }) => acc + delegatedAssets, 0n)
  const tvl = priceUsd * (scaleDown(totalAssets, decimals) - scaleDown(totalDelegatedAssets, decimals))

  return { priceUsd, source, tvl }
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
