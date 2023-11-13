import { chains, mq } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'
import db from '../db'

export class MetaExtractor implements Processor {
  queue: Queue | undefined
  worker: Worker | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
  }

  async down() {
    await this.queue?.close()
  }

  async extract() {
    const vaults = (await db.query(`SELECT DISTINCT chain_id as "chainId", asset_address as "assetAddress" FROM vault;`)).rows
    for(const vault of vaults as { chainId: number, assetAddress: `0x${string}` } []) {
      const tokenMeta = await extractTokenMeta(vault.chainId, vault.assetAddress)
      await this.queue?.add(mq.job.load.erc20, {
        chainId: vault.chainId,
        address: vault.assetAddress,
        meta_description: tokenMeta
      })
    }

    for(const chain of chains) {
      const strategies = (await db.query(`SELECT address FROM strategy WHERE chain_id = $1;`, [chain.id])).rows
      if(strategies.length === 0) continue
      const metas = await extractStrategyMetas(chain.id)
      for(const strategy of strategies as { address: `0x${string}` } []) {
        await this.queue?.add(mq.job.load.strategy, {
          chainId: chain.id,
          address: strategy,
          meta_description: metas[strategy.address]
        })
      }
    }
  }
}

export async function extractTokenMeta(chainId: number, token: `0x${string}`) {
  if(!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) throw new Error('!process.env.GITHUB_PERSONAL_ACCESS_TOKEN')

  const json = await (await fetch(
    `https://raw.githubusercontent.com/yearn/ydaemon/main/data/meta/tokens/${chainId}/${token}.json`,
    { headers: { Authorization: `Bearer ${process.env.GITHUB_PERSONAL_ACCESS_TOKEN}` } }
  )).json()

  return json.description
}

export async function extractStrategyMetas(chainId: number) {
  if(!process.env.GITHUB_PERSONAL_ACCESS_TOKEN) throw new Error('!process.env.GITHUB_PERSONAL_ACCESS_TOKEN')

  const result: {
    [strategy: `0x${string}`]: {
      description: string
  }} = {}

  const response = await fetch(
    `https://api.github.com/repos/yearn/ydaemon/contents/data/meta/strategies/${chainId}`,
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
      const description = json.description
      json.addresses.forEach((address: string) => {
        result[address as `0x${string}`] = description
      })
    } catch(error) {
      console.warn('🚨', 'bad path', path)
      console.warn(error)
    }
  }

  return result
}
