import { chains, mq, types } from 'lib'
import { getAddress } from 'viem'
import db from '../db'

export class RiskExtractor {
  async extract() {
    for(const chain of chains) {
      const groups = await extractRiskGroups(chain.id)
      await mq.add(mq.job.load.riskGroup, { batch: groups.map(({ strategies, ...rest }) => rest) })
      const strategies = (await db.query(`SELECT address FROM strategy WHERE chain_id = $1;`, [chain.id])).rows
      for(const strategy of strategies) {
        const group = groups.find(group => group.strategies.includes(strategy.address))
        await mq.add(mq.job.load.strategy, {
          chainId: chain.id,
          address: strategy.address,
          risk_group: group?.name || null
        })
      }
    }
  }
}

export async function extractRiskGroups(chainId: number) {
  if(!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) throw new Error('!process.env.GITHUB_PERSONAL_ACCESS_TOKEN')

  const result: types.RiskGroup [] = []

  const response = await fetch(
    `https://api.github.com/repos/yearn/ydaemon/contents/data/risks/networks/${chainId}`,
    { headers: { Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}` } }
  )

  const files = (await response.json()).map((file: any) => file.path)
  for(const path of files.filter((path: string) => path.endsWith('.json'))) {
    const response = await fetch(
      `https://raw.githubusercontent.com/yearn/ydaemon/main/${path}`,
      { headers: { Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}` } }
    )

    const json = await response.json()
    try {
      result.push({
        chainId,
        name: json.label,
        auditScore: json.auditScore,
        codeReviewScore: json.codeReviewScore,
        complexityScore: json.complexityScore,
        protocolSafetyScore: json.protocolSafetyScore,
        teamKnowledgeScore: json.teamKnowledgeScore,
        testingScore: json.testingScore,
        strategies: json.strategies.map((address: string) => getAddress(address))
      } as types.RiskGroup)
    } catch(error) {
      console.warn('🚨', 'bad path', path)
      console.warn(error)
    }
  }

  return result
}
