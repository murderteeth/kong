import { z } from 'zod'
import { rpcs } from '../rpcs'
import { mq } from 'lib'
import { EvmLogSchema, zhexstring } from 'lib/types'
import { getBlockTime, getDefaultStartBlockNumber } from 'lib/blocks'
import { getAddress } from 'viem'
import db from '../db'
import { ResolveHooks } from '../abis/types'
import { requireHooks } from '../abis'
import abiutil from '../abiutil'

const blacklist = ['Approval']
const limitlist = ['Transfer', 'Deposit', 'Withdraw']

export class EvmLogsExtractor {
  resolveHooks: ResolveHooks|undefined

  async extract(data: any) {
    if (!this.resolveHooks) this.resolveHooks = await requireHooks()

    const { abiPath, chainId, address, from, to, replay } = z.object({
      abiPath: z.string(),
      chainId: z.number(),
      address: zhexstring,
      from: z.bigint({ coerce: true }),
      to: z.bigint({ coerce: true }),
      replay: z.boolean().optional()
    }).parse(data)

    const abi = await abiutil.load(abiPath)
    const defaultStartBlockNumber = await getDefaultStartBlockNumber(chainId)
    const excludeLimitlist = from < defaultStartBlockNumber

    const events = excludeLimitlist
    ? abiutil.exclude([...blacklist, ...limitlist], abiutil.events(abi))
    : abiutil.exclude(blacklist, abiutil.events(abi))

    const logs = await (async () => {
      if (replay) {
        return await fetchLogs(chainId, address, from, to)
      } else {
        return await rpcs.next(chainId, from).getLogs({
          address,
          events,
          fromBlock: BigInt(from),
          toBlock: BigInt(to)
        })
      }
    })()

    const hooks = this.resolveHooks(abiPath, 'event')
    const processedLogs = []
    for (const log of logs) {
      if(!log.topics[0]) throw new Error('!log.topics[0]')
      const topic = log.topics[0]
      const topical = hooks.filter(h => h.module.topics && h.module.topics.includes(topic))

      let hookResult = {}
      for (const hook of topical) {
        try {
          hookResult = {
            ...hookResult,
            ...await hook.module.default(chainId, address, log)
          }
        } catch(error) {
          console.warn('🚨', 'hook fail', error)
        }
      }

      processedLogs.push({
        ...log,
        chainId,
        address: getAddress(log.address),
        signature: log.topics[0],
        args: extractLogArgs(log),
        hook: hookResult,
        blockTime: await getBlockTime(chainId, log.blockNumber || undefined)
      })
    }

    try {
      await mq.add(mq.job.load.evmlog, {
        chainId, address, from, to,
        batch: EvmLogSchema.array().parse(processedLogs)
      }, {
        priority: mq.LOWEST_PRIORITY
      })
    } catch (error) {
      console.log('--------')
      console.log()
      console.log(processedLogs)
      console.log()
      console.log('--------')
      throw error
    }
  }
}

export function extractLogArgs(log: any) {
  if (!log.args) return {}
  if (Array.isArray(log.args)) {
    return log.args.reduce((acc: any, arg: any, i: number) => {
      acc[`arg${i}`] = arg
      return acc
    }, {})
  } else {
    return log.args
  }
}

async function fetchLogs(chainId: number, address: `0x${string}`, from: bigint, to: bigint) {
  const result = await db.query(`
    SELECT
      chain_id as "chainId",
      address,
      event_name as "eventName",
      signature,
      topics,
      args,
      hook,
      block_number as "blockNumber",
      block_time as "blockTime",
      log_index as "logIndex",
      transaction_hash as "transactionHash",
      transaction_index as "transactionIndex"
    FROM evmlog
    WHERE chain_id = $1 AND address = $2 AND block_number >= $3 AND block_number <= $4
  `, [chainId, address, from, to])
  return EvmLogSchema.array().parse(result.rows)
}
