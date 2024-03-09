import { z } from 'zod'
import { Processor } from 'lib/processor'
import { rpcs } from '../rpcs'
import { Queue } from 'bullmq'
import { mq } from 'lib'
import { estimateHeight, getBlock } from 'lib/blocks'
import { first } from '../db'
import { parseAbi } from 'viem'
import { priced } from 'lib/math'
import { endOfDay } from 'lib/dates'
import { OutputSchema, Snapshot, SnapshotSchema, Thing, ThingSchema, zhexstring } from 'lib/types'
import { fetchErc20PriceUsd } from '../prices'
import { fetchOrExtractErc20 } from '../abis/yearn/lib'
import { compare } from 'compare-versions'
import { extractWithdrawalQueue } from '../abis/yearn/2/vault/snapshot/hook'

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

    const { source: priceSource, tvl: tvlUsd } = await _compute(chainId, address, blockNumber, latest)
    const artificialBlockTime = endOfDay(time)

    await this.queue?.add(mq.job.load.output, OutputSchema.parse({
      chainId, address, blockNumber, blockTime: artificialBlockTime, label: 'tvl', component: priceSource, value: tvlUsd
    }))
  }
}

export async function _compute(chainId: number, address: `0x${string}`, blockNumber: bigint, latest = false) {
  const { defaults } = await first<Thing>(
    ThingSchema,
    'SELECT * FROM thing WHERE chain_id = $1 AND address = $2 AND label = $3',
    [chainId, address, 'vault']
  )

  const { apiVersion, asset } = z.object({ 
    apiVersion: z.string(),
    asset: zhexstring
  }).parse(defaults)

  const erc20 = await fetchOrExtractErc20(chainId, asset)

  const { priceUsd, priceSource: source } = await fetchErc20PriceUsd(chainId, erc20.address, blockNumber, latest)

  const totalAssets = await rpcs.next(chainId, blockNumber).readContract({
    address, functionName: 'totalAssets',
    abi: parseAbi(['function totalAssets() view returns (uint256)']),
    blockNumber
  }) as bigint

  if(totalAssets === 0n) return { priceUsd, source, tvl: 0 }

  const totalDelegatedAssets = compare(apiVersion, '3.0.0', '<')
  ? await extractTotalDelegatedAssets(chainId, address, blockNumber)
  : 0n

  const tvl = priced(totalAssets, erc20.decimals, priceUsd) 
  - priced(totalDelegatedAssets, erc20.decimals, priceUsd)

  return { priceUsd, source, tvl }
}

async function extractTotalDelegatedAssets(chainId: number, vault: `0x${string}`, blockNumber: bigint) {
  const strategies = await extractWithdrawalQueue(chainId, vault, blockNumber)
  const delegatedAssets = await extractDelegatedAssets(chainId, strategies, blockNumber)
  return delegatedAssets.reduce((acc, { delegatedAssets }) => acc + delegatedAssets, 0n)
}

async function extractDelegatedAssets(chainId: number, addresses: `0x${string}` [], blockNumber: bigint) {
  const results = [] as { address: `0x${string}`, delegatedAssets: bigint } []

  const contracts = addresses.map(address => ({
    args: [], address, functionName: 'delegatedAssets', abi: parseAbi(['function delegatedAssets() view returns (uint256)'])
  }))

  const multicallresults = await rpcs.next(chainId, blockNumber).multicall({ contracts, blockNumber})

  multicallresults.forEach((result, index) => {
    const delegatedAssets = result.status === 'failure'
    ? 0n
    : BigInt(result.result as bigint)

    results.push({ address: addresses[index], delegatedAssets })
  })

  return results
}
