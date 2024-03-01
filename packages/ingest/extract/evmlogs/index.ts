import { z } from 'zod'
import path from 'path'
import { Processor } from 'lib/processor'
import { rpcs } from '../../rpcs'
import { RegistryHandler } from './handlers/registry'
import { VaultHandler } from './handlers/vault'
import { DebtManagerFactoryHandler } from './handlers/debtManagerFactory'
import { Queue } from 'bullmq'
import { abiutil, mq } from 'lib'
import { EvmLogSchema, zhexstring } from 'lib/types'
import { getBlockTime, getDefaultStartBlockNumber } from 'lib/blocks'
import { Log, getAddress } from 'viem'
import resolveAbiHooks from 'lib/resolveAbiHooks'

export interface Handler extends Processor {
  handle: (chainId: number, address: `0x${string}`, logs: any[]) => Promise<void>
}

export interface Hook extends Processor {
  process: (chainId: number, address: `0x${string}`, log: Log) => Promise<any|undefined>
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
    const { abiPath, chainId, address, from, to, handler } = z.object({
      abiPath: z.string(),
      chainId: z.number(),
      address: zhexstring,
      from: z.bigint({ coerce: true }),
      to: z.bigint({ coerce: true }),
      handler: z.string().optional()
    }).parse(data)

    const abi = await abiutil.load(abiPath)
    const defaultStartBlockNumber = await getDefaultStartBlockNumber(chainId)
    const exlcludeTransfers = from < defaultStartBlockNumber

    const events = exlcludeTransfers
    ? abiutil.exclude('Transfer', abiutil.events(abi))
    : abiutil.events(abi)

    const logs = await rpcs.next(chainId, from).getLogs({
      address,
      events,
      fromBlock: BigInt(from),
      toBlock: BigInt(to)
    })

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
