import { Queue } from 'bullmq'
import db from '../db'
import { Processor } from 'lib/processor'
import { chains, dates, math, mq } from 'lib'
import { setTimeout } from 'timers/promises'
import { endOfDay } from 'lib/dates'
import { hasAtLeastTwoHarvests } from '../compute/apy'
import { compare } from 'compare-versions'

export default class ApyFanout implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.compute)
  }

  async down() {
    await this.queue?.close()
  }

  async fanout() {
    for(const chain of chains) {
      const throttle = 16
      const oneDay = BigInt(24 * 60 * 60)

      for(const { address, type, apiVersion, activation, blockTime } of await getLatestVaultApyTimes(chain.id)) {
        if((type === 'strategy' || compare(apiVersion, '3.0.1', '<')) && !(await hasAtLeastTwoHarvests(chain.id, address))) continue
        const start = endOfDay(math.max(blockTime || 0n, activation, dates.DEFAULT_START()))
        const end = endOfDay(BigInt(Math.floor(new Date().getTime() / 1000)))
        for(let time = start; time <= end; time += oneDay) {
          await this.queue?.add(mq.job.compute.apy, {
            chainId: chain.id, address, time
          })
        }
        await setTimeout(throttle)
      }
    }
  }
}

export async function getLatestVaultApyTimes(chainId: number) {
  const result = await db.query(`
    SELECT 
      v.address,
      v.type,
      v.api_version as "apiVersion",
      FLOOR(EXTRACT(EPOCH FROM MAX(v.activation_block_time))) as "activation",
      FLOOR(EXTRACT(EPOCH FROM MAX(apy.block_time))) as "blockTime"
    FROM vault v
    LEFT OUTER JOIN apy
    ON v.chain_id = apy.chain_id AND v.address = apy.address
    WHERE v.chain_id = $1
    GROUP BY v.address, v.type, v.api_version, v.activation_block_time;
  `, [chainId])
  return result.rows as { 
    address: `0x${string}`,
    type: string,
    apiVersion: string,
    activation: bigint,
    blockTime: bigint | null
  }[]
}
