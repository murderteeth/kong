import { z } from 'zod'
import { rpcs } from 'lib/rpcs'
import { parseAbi } from 'viem'
import db from '../../../db'
import { zhexstring } from 'lib/types'

export async function extractDecimals(chainId: number, address: `0x${string}`) {
  return await extractUint256(chainId, address, 'decimals')
}

export async function fetchAssetDecimals(chainId: number, address: `0x${string}`) {
  return (await db.query(
    `SELECT defaults #>> '{asset, decimals}' AS decimals FROM thing WHERE chain_id = $1 AND address = $2`, 
    [chainId, address]
  )).rows[0]?.decimals as number
}

export async function fetchOrExtractDecimals(chainId: number, address: `0x${string}`) {
  const result = await fetchAssetDecimals(chainId, address)
  if (result) return result
  try {
    return Number(await extractDecimals(chainId, address))
  } catch(_) {
    // assume address belongs to a v2 strategy
    const want = await extractAddress(chainId, address, 'want')
    return Number(await extractDecimals(chainId, want))
  }
}

export async function fetchAssetAddress(chainId: number, address: `0x${string}`, label: string) {
  return (await db.query(
    `SELECT defaults #>> '{asset, address}' AS address FROM thing WHERE chain_id = $1 AND address = $2 AND label = $3`, 
    [chainId, address, label])
  ).rows[0]?.address as `0x${string}`
}

export async function fetchOrExtractAssetAddress(chainId: number, address: `0x${string}`, label: string, assetField: string) {
  const result = await fetchAssetAddress(chainId, address, label)
  if (result) return result
  return await extractAddress(chainId, address, assetField)
}

export async function extractAddress(chainId: number, address: `0x${string}`, field: string) {
  return await rpcs.next(chainId).readContract({
    address, abi: parseAbi([`function ${field}() view returns (address)`]),
    functionName: field
  })
}

export async function extractUint256(chainId: number, address: `0x${string}`, field: string) {
  return await rpcs.next(chainId).readContract({
    address, abi: parseAbi([`function ${field}() view returns (uint256)`]),
    functionName: field
  })
}

export async function fetchOrExtractErc20(chainId: number, address: `0x${string}`) {
  const result = await fetchErc20(chainId, address)
  if (result) return result
  return await extractErc20(chainId, address)
}

export async function fetchErc20(chainId: number, address: `0x${string}`) {
  const rows = (await db.query(`
    SELECT 
      chain_id AS "chainId",
      address,
      defaults->'name' AS name, 
      defaults->'symbol' AS symbol, 
      defaults->'decimals' AS decimals 
    FROM thing 
    WHERE chain_id = $1 AND address = $2 AND label = 'erc20'`,
    [chainId, address]
  )).rows
  if (rows.length === 0) return undefined
  return z.object({
    chainId: z.number(),
    address: zhexstring,
    name: z.string(),
    symbol: z.string(),
    decimals: z.bigint({ coerce: true })
  }).parse(rows[0])
}

export async function extractErc20(chainId: number, address: `0x${string}`) {
  const multicall = await rpcs.next(chainId).multicall({ contracts: [
    { address, functionName: 'name', abi: parseAbi(['function name() view returns (string)']) },
    { address, functionName: 'symbol', abi: parseAbi(['function symbol() view returns (string)']) },
    { address, functionName: 'decimals', abi: parseAbi(['function decimals() view returns (uint256)']) }
  ] })
  if (multicall.some(result => result.status !== 'success')) throw new Error('!multicall.success')
  return {
    chainId,
    address,
    name: multicall[0].result!,
    symbol: multicall[1].result!,
    decimals: multicall[2].result!
  }
}
