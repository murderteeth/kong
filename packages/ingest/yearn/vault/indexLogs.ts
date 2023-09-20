import { setTimeout } from 'node:timers/promises'
import { Queue } from 'bullmq'
import { mq } from 'lib'
import db, { getLatestBlock } from '../../db'

export async function indexLogs(queue: Queue, 
  options: { chainId: number, address: string, from?: bigint, to?: bigint }
  ) {

  const { chainId, address } = options

  const from = options.from || await getActivationBlock(chainId, address)
  if(!from) throw new Error(`no activation block for ${chainId} ${address}`)

  const to = options.to || await getLatestBlock(chainId)
  const stride = 100_000n
  const throttle = 16

  console.log('🗂️ ', 'index vault', chainId, address, from, to)

  for (let block = BigInt(from); block <= to; block += stride) {
    const toBlock = block + stride - 1n < to ? block + stride - 1n : to
    const options = { chainId, address, from: block.toString(), to: toBlock.toString() }
    console.log('🌭', 'catchup block', 'q log extract', options.from, options.to)
    await queue.add(mq.q.yearn.vault.extractJobs.logs, options)
    await setTimeout(throttle)
  }
}

export async function getActivationBlock(chainId: number, address: string) {
  const result = await db.query(`
    SELECT activation_block_number
    FROM vault
    WHERE chain_id = $1 AND address = $2
  `, [chainId, address])
  return result.rows[0].activation_block_number as bigint | null | undefined
}
