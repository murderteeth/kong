import { rpcs } from 'lib/rpcs'
import { parseAbi } from 'viem'
import db from '../../../../../db'
import { zhexstring } from 'lib/types'

export async function extractDecimals(chainId: number, address: `0x${string}`) {
  return await extractUint256(chainId, address, 'decimals')
}

export async function fetchDecimals(chainId: number, address: `0x${string}`, label: string) {
  return (await db.query(
    `SELECT defaults->'decimals' AS decimals FROM thing WHERE chain_id = $1 AND address = $2 AND label = $3`, 
    [chainId, address, label]
  )).rows[0]?.decimals as number
}

export async function fetchOrExtractDecimals(chainId: number, address: `0x${string}`, label: string) {
  const result = await fetchDecimals(chainId, address, label)
  if (result) return result
  return Number(await extractDecimals(chainId, address))
}

export async function fetchAsset(chainId: number, address: `0x${string}`, label: string) {
  return (await db.query(
    `SELECT defaults->'asset' AS asset FROM thing WHERE chain_id = $1 AND address = $2 AND label = $3`, 
    [chainId, address, label])
  ).rows[0]?.asset as `0x${string}`
}

export async function fetchOrExtractAsset(chainId: number, address: `0x${string}`, label: string, assetField: string) {
  const result = await fetchAsset(chainId, address, label)
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
