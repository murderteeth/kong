import { z } from 'zod'
import path from 'path'
import { Processor } from 'lib/processor'
import { rpcs } from '../../rpcs'
import { RegistryHandler } from './handlers/registry'
import { VaultHandler } from './handlers/vault'
import { DebtManagerFactoryHandler } from './handlers/debtManagerFactory'
import { Queue } from 'bullmq'
import { abiutil, mq } from 'lib'
import { EvmLog, EvmLogSchema, zhexstring } from 'lib/types'
import { getBlockTime, getDefaultStartBlockNumber } from 'lib/blocks'
import { Log, getAddress } from 'viem'
import resolveAbiHooks from 'lib/resolveAbiHooks'
import db from '../../db'

export interface Handler extends Processor {
  handle: (chainId: number, address: `0x${string}`, logs: any[]) => Promise<void>
}

export interface Hook extends Processor {
  process: (chainId: number, address: `0x${string}`, log: Log|EvmLog) => Promise<any|undefined>
}

export class EvmLogsExtractor implements Processor {
  queues: { [key: string]: Queue } = {}
  postprocessors: {
    abiPath: string,
    hook: Hook
  }[] = []

  handlers = {
    registry: new RegistryHandler(),
    vault: new VaultHandler(),
    debtManagerFactory: new DebtManagerFactoryHandler()
  } as { [key: string]: Handler }

  async up() {
    await resolveAbiHooks(path.join(__dirname, 'hooks'), (abiPath: string, module: any) => {
      this.postprocessors.push({ abiPath, hook: new module.default() })
    })

    this.queues[mq.q.load] = mq.queue(mq.q.load)
    await Promise.all(Object.values(this.postprocessors).map(p => p.hook.up()))
    await Promise.all(Object.values(this.handlers).map(h => h.up()))
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
    await Promise.all(Object.values(this.postprocessors).map(p => p.hook.down()))
    await Promise.all(Object.values(this.handlers).map(h => h.down()))
  }

  async extract(data: any) {
    const { abiPath, chainId, address, from, to, replay, handler } = z.object({
      abiPath: z.string(),
      chainId: z.number(),
      address: zhexstring,
      from: z.bigint({ coerce: true }),
      to: z.bigint({ coerce: true }),
      replay: z.boolean().optional(),
      handler: z.string().optional()
    }).parse(data)

    const abi = await abiutil.load(abiPath)
    const defaultStartBlockNumber = await getDefaultStartBlockNumber(chainId)
    const exlcludeTransfers = from < defaultStartBlockNumber

    const events = exlcludeTransfers
    ? abiutil.exclude('Transfer', abiutil.events(abi))
    : abiutil.events(abi)

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

    const postprocessor = this.postprocessors.find(p => p.abiPath === abiPath)
    const processedLogs = []
    for (const log of logs) {
      const post = postprocessor 
      ? await postprocessor.hook.process(chainId, address, log) || {}
      : {}

      processedLogs.push({
        ...log,
        chainId,
        address: getAddress(log.address),
        signature: log.topics[0],
        post,
        blockTime: await getBlockTime(chainId, log.blockNumber || undefined)
      })
    }

    await this.queues[mq.q.load].add(mq.job.load.evmlog, { 
      chainId, address, from, to,
      batch: EvmLogSchema.array().parse(processedLogs)
    }, {
      priority: mq.LOWEST_PRIORITY
    })

    // await this.handlers[handler].handle(chainId, address, logs)
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
      post,
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
