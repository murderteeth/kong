import { z } from 'zod'
import { Output, OutputSchema, Thing, ThingSchema, zhexstring } from 'lib/types'
import { fetchOrExtractErc20 } from '.'
import { fetchErc20PriceUsd } from '../../../prices'
import { rpcs } from '../../../rpcs'
import { parseAbi } from 'viem'
import { compare } from 'compare-versions'
import { priced } from 'lib/math'
import { extractWithdrawalQueue } from '../2/vault/snapshot/hook'
import { Data } from '../../../extract/timeseries'
import { estimateHeight, getBlock } from 'lib/blocks'
import { first } from '../../../db'

export default async function _process(chainId: number, address: `0x${string}`, data: Data): Promise<Output[]> {
  console.info('🧮', data.outputLabel, chainId, address, (new Date(Number(data.blockTime) * 1000)).toDateString())

  let blockNumber: bigint = 0n
  let latest: boolean = false
  if(data.blockTime >= BigInt(Math.floor(new Date().getTime() / 1000))) {
    latest = true;
    ({ number: blockNumber } = await getBlock(chainId))
  } else {
    const estimate = await estimateHeight(chainId, data.blockTime);
    ({ number: blockNumber } = await getBlock(chainId, estimate))
  }

  const vault = await first<Thing>(ThingSchema,
    'SELECT * FROM thing WHERE chain_id = $1 AND address = $2 AND label = $3',
    [chainId, address, 'vault']
  )

  if (!vault) return []

  const { source: priceSource, tvl: tvlUsd } = await _compute(vault, blockNumber, latest)

  return OutputSchema.array().parse([{
    chainId, address, blockNumber, blockTime: data.blockTime, label: data.outputLabel, 
    component: priceSource, value: tvlUsd
  }])
}

export async function _compute(vault: Thing, blockNumber: bigint, latest = false) {
  const { chainId, address, defaults } = vault
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
