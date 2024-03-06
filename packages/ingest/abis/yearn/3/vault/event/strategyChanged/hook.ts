import { z } from 'zod'
import { toEventSelector } from 'viem'
import { ThingSchema, zhexstring } from 'lib/types'
import db from '../../../../../../db'
import { upsert } from '../../../../../../load'

const changeType = {
  add: 2n ** 0n,
  revoke: 2n ** 1n
}

export const topics = [
  `event StrategyChanged(address indexed strategy, uint256 change_type)`,
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const vault = address
  const { strategy, change_type } = z.object({
    strategy: zhexstring,
    change_type: z.bigint({ coerce: true })
  }).parse(data.args)

  const client = await db.connect()

  try {
    await client.query('BEGIN')

    const defaults: any = (await client.query(
    'SELECT defaults FROM thing WHERE chain_id = $1 AND address = $2 AND label = $3 FOR UPDATE', 
    [chainId, vault, 'vault']))
    .rows[0]?.defaults || {}

    defaults.strategies = defaults.strategies || []

    if (change_type === changeType.add) {
      defaults.strategies.push(strategy)
    } else if (change_type === changeType.revoke) {
      const index = defaults.strategies.indexOf(strategy)
      if (index !== -1) defaults.strategies.splice(index, 1)
    }
  
    const thing = ThingSchema.parse({ chainId, address: vault, label: 'vault', defaults })
  
    await upsert(thing, 'thing', 'chain_id, address, label', undefined, client)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
