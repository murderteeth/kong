import { chains, mq } from 'lib'
import db from '../db'

export class MetaExtractor {
  async extract() {
    for(const chain of chains) {
      const tokenMetas = await extractTokenMetas(chain.id)
      const vaults = (await db.query(`SELECT DISTINCT chain_id as "chainId", asset_address as "assetAddress" FROM vault WHERE chain_id = $1;`, [chain.id])).rows
      for(const vault of vaults as { chainId: number, assetAddress: `0x${string}` } []) {
        const meta = tokenMetas[vault.assetAddress] || tokenMetas[vault.assetAddress.toLowerCase()]
        if(meta === undefined) continue
        await mq.add(mq.job.load.erc20, {
          chainId: vault.chainId,
          address: vault.assetAddress,
          meta_description: meta.description
        })
      }
    }

    for(const chain of chains) {
      const strategies = (await db.query(`SELECT address FROM strategy WHERE chain_id = $1;`, [chain.id])).rows
      if(strategies.length === 0) continue
      const metas = await extractStrategyMetas(chain.id)
      for(const strategy of strategies as { address: `0x${string}` } []) {
        const meta = metas[strategy.address] || metas[strategy.address.toLowerCase()]
        if(meta === undefined) continue
        await mq.add(mq.job.load.strategy, {
          chainId: chain.id,
          address: strategy.address,
          meta_description: meta.description
        })
      }
    }
  }
}

export async function extractTokenMetas(chainId: number) {
  if(!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) throw new Error('!process.env.GITHUB_PERSONAL_ACCESS_TOKEN')
  try {
    const json = await (await fetch(
      `https://raw.githubusercontent.com/yearn/ydaemon/main/data/meta/tokens/${chainId}.json`,
      { headers: { Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}` } }
    )).json()
    return json.tokens
  } catch(error) {
    console.warn('🚨', 'bad path', `data/meta/tokens/${chainId}.json`)
    console.warn(error)
  }
}

export async function extractStrategyMetas(chainId: number) {
  if(!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) throw new Error('!process.env.GITHUB_PERSONAL_ACCESS_TOKEN')
  try {
    const json = await (await fetch(
      `https://raw.githubusercontent.com/yearn/ydaemon/main/data/meta/strategies/${chainId}.json`,
      { headers: { Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}` } }
    )).json()
    return json.strategies
  } catch( error ) {
    console.warn('🚨', 'bad path', `data/meta/strategies/${chainId}.json`)
    console.warn(error)
  }
}
