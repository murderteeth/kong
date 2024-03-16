import { cache } from 'lib'
import { RiskGroup, RiskGroupSchema, RiskScoreSchema } from 'lib/types'
import { getAddress } from 'viem'

export async function getRiskScore(chainId: number, address: `0x${string}`) {
  address = getAddress(address)
  const groups = await getRiskGroups(chainId)
  const group = groups.find(g => g.strategies.includes(address))
  return group ? RiskScoreSchema.parse(group) : undefined
}

async function getRiskGroups(chainId: number): Promise<RiskGroup[]> {
  return cache.wrap('abis/yearn/lib/risk', async () => {
    return await extractRiskGroups(chainId)
  }, 30 * 60 * 1000)
}

async function extractRiskGroups(chainId: number) {
  if(!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) throw new Error('!process.env.GITHUB_PERSONAL_ACCESS_TOKEN')

  const response = await fetch(
    `https://api.github.com/repos/yearn/ydaemon/contents/data/risks/networks/${chainId}`,
    { headers: { Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}` } }
  )

  const json = await response.json()
  const files = json.map((file: any) => file.path)
  const paths = files.filter((path: string) => path.endsWith('.json'))
  const responses = await Promise.all(paths.map((path: string) => fetch(
    `https://raw.githubusercontent.com/yearn/ydaemon/main/${path}`,
    { headers: { Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}` } }
  )))

  const jsons = await Promise.all(responses.map(response => response.json()))
  return jsons.map(json => RiskGroupSchema.parse({
    ...json, strategies: json.strategies.map((s: string) => getAddress(s))
  }))
}
