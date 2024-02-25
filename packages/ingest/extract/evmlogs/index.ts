import { promises as fs } from 'fs'
import path from 'path'
import { Processor } from 'lib/processor'
import { rpcs } from '../../rpcs'
import { RegistryHandler } from './handlers/registry'
import { VaultHandler } from './handlers/vault'
import { DebtManagerFactoryHandler } from './handlers/debtManagerFactory'
import grove from 'lib/grove'
import { StrideProcessor } from 'lib/grove/strideProcessor'
import { Queue } from 'bullmq'
import { mq } from 'lib'
import { EvmLogSchema } from 'lib/types'
import { getBlockTime } from 'lib/blocks'
import { Log } from 'viem'

export interface Handler extends Processor {
  handle: (chainId: number, address: `0x${string}`, logs: any[]) => Promise<void>
}

export interface Hook extends Processor {
  key: string
  hook: (chainId: number, address: `0x${string}`, log: Log) => Promise<any|undefined>
}

export class EvmLogsExtractor implements Processor {
  queues: { [key: string]: Queue } = {}
  hooks: Hook[] = []

  handlers = {
    registry: new RegistryHandler(),
    vault: new VaultHandler(),
    debtManagerFactory: new DebtManagerFactoryHandler()
  } as { [key: string]: Handler }

  async up() {
    (await fs.readdir(path.join(__dirname, 'hooks'), { withFileTypes: true })).forEach(dirent => {
      if(dirent.isFile()) {
        const hookPath = path.join(__dirname, 'hooks', dirent.name)
        const HookClass = require(hookPath).default
        this.hooks.push(new HookClass())
      }
    })

    this.queues[mq.q.load] = mq.queue(mq.q.load)
    await Promise.all(Object.values(this.hooks).map(h => h.up()))
    await Promise.all(Object.values(this.handlers).map(h => h.up()))
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
    await Promise.all(Object.values(this.hooks).map(h => h.down()))
    await Promise.all(Object.values(this.handlers).map(h => h.down()))
  }

  async extract(data: any) {
    const { chainId, address, events: eventsJson, from, to, useGrove, handler } = data
    const events = JSON.parse(eventsJson)

    const logs = await (async () => {
      if (useGrove) {
        return await grove().getLogs(chainId, address, from, to) as Log[]
      } else {
        const logs = await rpcs.next(chainId, from).getLogs({
          address,
          events,
          fromBlock: BigInt(from),
          toBlock: BigInt(to)
        })
    
        for (const log of logs) {
          const _path = `evmlog/${chainId}/${address}/${log.topics[0]}/${log.blockNumber}-${log.logIndex}-${log.transactionHash}-${log.transactionIndex}.json`
          await grove().store(_path, log)
        }
    
        await StrideProcessor.get().add(chainId, address, { from, to })
        return logs
      }
    })()

    const preparedLogs = []
    for (const log of logs) {
      const hookResults: { [key: string]: any } = {}
      for (const { key, hook } of this.hooks) {
        const result = await hook(chainId, address, log)
        if(result) hookResults[key] = result
      }

      preparedLogs.push({
        ...log,
        chainId,
        topic: log.topics[0],
        hooks: hookResults,
        blockTime: await getBlockTime(chainId, log.blockNumber || undefined)
      })
    }

    await this.queues[mq.q.load].add(mq.job.load.evmlog, { 
      chainId, address, from, to,
      batch: EvmLogSchema.array().parse(preparedLogs)
    }, {
      priority: mq.LOWEST_PRIORITY
    })

    // await this.handlers[handler].handle(chainId, address, logs)
  }
}
