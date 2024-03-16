import { z } from 'zod'
import { cache } from 'lib'
import { StrategyMeta, StrategyMetaSchema, TokenMeta, TokenMetaSchema, VaultMeta, VaultMetaSchema } from 'lib/types'
import { getAddress } from 'viem'

type Metas<T> = { [address: `0x${string}`]: T }

export async function getVaultMeta(chainId: number, address: `0x${string}`) {
  return (await getMetas<VaultMeta>(VaultMetaSchema, chainId, 'vaults'))[getAddress(address)]
}

export async function getStrategyMeta(chainId: number, address: `0x${string}`) {
  return (await getMetas<StrategyMeta>(StrategyMetaSchema, chainId, 'strategies'))[getAddress(address)]
}

export async function getTokenMeta(chainId: number, address: `0x${string}`) {
  return (await getMetas<TokenMeta>(TokenMetaSchema, chainId, 'tokens'))[getAddress(address)]
}

async function getMetas<T>(schema: z.ZodType<T>, chainId: number, type: 'tokens' | 'vaults' | 'strategies'): Promise<Metas<T>> {
  return cache.wrap(`abis/yearn/lib/meta/${type}/${chainId}`, async () => {
    return await extractMetas<T>(schema, chainId, type)
  }, 30 * 60 * 1000)
}

async function extractMetas<T>(schema: z.ZodType<T>, chainId: number, type: 'tokens' | 'vaults' | 'strategies'): Promise<Metas<T>> {
  if(!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) throw new Error('!process.env.GITHUB_PERSONAL_ACCESS_TOKEN')

  const json = await (await fetch(
    `https://raw.githubusercontent.com/yearn/ydaemon/main/data/meta/${type}/${chainId}.json`,
    { headers: { Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}` } }
  )).json()

  const results: { [address: `0x${string}`]: T } = {}
  for (const address of Object.keys(json[type])) {
    results[getAddress(address)] = json[type][address].metadata
    ? schema.parse(json[type][address].metadata)
    : schema.parse(json[type][address])
  }

  return results
}
