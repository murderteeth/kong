import { query, some } from './db'
import { ThingsConfig } from 'lib/contracts'
import { Thing, ThingSchema } from 'lib/types'
import { CompareOperator, compare } from 'compare-versions'
import { clean } from 'lib/version'

export const semver = /^(\d+)\.(\d+)\.(\d+)$/

export async function get(config: ThingsConfig): Promise<Thing[]> {
  const allthings = await query<Thing>(ThingSchema, 'SELECT * FROM thing WHERE label = $1', [config.label])
  if(config.filter.length === 0) return allthings
  return allthings.filter(thing => {
    for (const filter of config.filter) {
      const field = thing.defaults[filter.field]
      if (semver.test(filter.value)) {
        if (!(field && compare(clean(field), filter.value, (filter.op as CompareOperator)))) return false
      } else {
        throw new Error('not implemented')
      }
    }
    return true
  })
}

export async function exist(chainId: number, address: `0x${string}`, label: string) {
  return await some('SELECT 1 FROM thing WHERE chain_id = $1 AND address = $2 AND label = $3', [chainId, address, label])
}
