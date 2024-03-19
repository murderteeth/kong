import { z } from 'zod'
import { cache } from './cache'
import { rpcs } from './rpcs'
import { dates } from '.'

export const BlockSchema = z.object({
  chainId: z.number(),
  number: z.bigint({ coerce: true }),
  timestamp: z.bigint({ coerce: true })
})

export type Block = z.infer<typeof BlockSchema>

export async function getBlockNumber(chainId: number, blockNumber?: bigint): Promise<bigint> {
  return (await getBlock(chainId, blockNumber)).number
}

export async function getBlockTime(chainId: number, blockNumber?: bigint): Promise<bigint> {
  return (await getBlock(chainId, blockNumber)).timestamp
}

export async function getBlock(chainId: number, blockNumber?: bigint): Promise<Block> {
  const result = cache.wrap(`getBlock:${chainId}:${blockNumber}`, async () => {
    const block = await __getBlock(chainId, blockNumber)
    return BlockSchema.parse({
      chainId,
      number: block.number,
      timestamp: block.timestamp
    })
  }, 10_000)
  return BlockSchema.parse(await result)
}

async function __getBlock(chainId: number, blockNumber?: bigint) {
  return await rpcs.next(chainId).getBlock({ blockNumber })
}

export async function getDefaultStartBlockNumber(chainId: number): Promise<bigint> {
  const result = cache.wrap(`getDefaultStartBlock:${chainId}`, async () => {
    return await estimateHeight(chainId, dates.DEFAULT_START())
  }, 10_000)
  return BigInt(await result)
}

export async function estimateHeight(chainId: number, timestamp: bigint): Promise<bigint> {
  const result = cache.wrap(`estimateHeight:${chainId}:${timestamp}`, async () => {
    return BigInt(await __estimateHeight(chainId, timestamp))
  }, 10_000)
  return BigInt(await result)
}

async function __estimateHeight(chainId: number, timestamp: bigint) {
  try {
    return await estimateHeightLlama(chainId, timestamp)
  } catch(error) {
    console.warn('🚨', 'estimateHeightLlama failed, trying estimateHeightManual')
    return await estimateHeightManual(chainId, timestamp)
  }
}

async function estimateHeightLlama(chainId: number, timestamp: bigint) {
	const chain = (rpcs.next(chainId).chain?.name as string).toLowerCase()
	const response = await fetch(`https://coins.llama.fi/block/${chain}/${timestamp}`, {
		headers: {accept: 'application/json'}
	});
	const { height } = await response.json();
	return height;
}

async function estimateHeightManual(chainId: number, timestamp: bigint) {
  const top = await getBlock(chainId)
  let hi = BigInt(top.number)
  let lo = 0n
  let block = top

  while ((hi - lo) > 1n) {
    const mid = (hi + lo) / 2n
    block = await getBlock(chainId, mid)
    if (block.timestamp < timestamp) {
      lo = mid + 1n
    } else {
      hi = mid - 1n
    }
  }

  return block.number
}

export async function estimateCreationBlock(chainId: number, contract: `0x${string}`): Promise<Block> {
  const result = cache.wrap(`estimateCreationBlock:${chainId}:${contract}`, async () => {
    return await __estimateCreationBlock(chainId, contract)
  }, 10_000)
  return BlockSchema.parse(await result)
}

// use bin search to estimate contract creat block
// doesn't account for CREATE2 or SELFDESTRUCT
// adapted from https://github.com/BobTheBuidler/ypricemagic/blob/5ba16b25302b47539b4e5a996554ba4c0a70e7c7/y/contracts.py#L68
async function __estimateCreationBlock(chainId: number, contract: `0x${string}`): Promise<Block> {
  let counter = 0
  const label = `🕊 __estimateCreationBlock ${chainId} ${contract}`
  console.time(label)
  const height = await rpcs.next(chainId).getBlockNumber()
  let lo = 0n, hi = height, mid = lo + (hi - lo) / 2n
  while (hi - lo > 1n) {
    const bytecode = await rpcs.next(chainId).getBytecode({ address: contract, blockNumber: mid })
    if(!bytecode || bytecode.length === 0) { lo = mid } else { hi = mid }
    mid = lo + (hi - lo) / 2n
    counter++
  }
  console.log('💥', 'estimateCreationBlock', chainId, contract, counter, hi)
  console.timeEnd(label)
  return await getBlock(chainId, hi)
}
