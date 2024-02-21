import { Processor } from 'lib/processor'
import { rpcs } from '../../rpcs'
import { RegistryHandler } from './handlers/registry'
import { VaultHandler } from './handlers/vault'
import { DebtManagerFactoryHandler } from './handlers/debtManagerFactory'
import grove from 'lib/grove'
import strides from 'lib/grove/strides'
import { toEventSelector } from 'viem'
import { setTimeout } from 'timers/promises'

export interface Handler extends Processor {
  handle: (chainId: number, address: `0x${string}`, logs: any[]) => Promise<void>
}

export class EvmLogsExtractor implements Processor {
  handlers = {
    registry: new RegistryHandler(),
    vault: new VaultHandler(),
    debtManagerFactory: new DebtManagerFactoryHandler()
  } as { [key: string]: Handler }

  async up() {
    await Promise.all(Object.values(this.handlers).map(h => h.up()))
  }

  async down() {
    await Promise.all(Object.values(this.handlers).map(h => h.down()))
  }

  async extract(data: any) {
    const { chainId, address, events: eventsJson, from, to, handler } = data
    const events = JSON.parse(eventsJson)

    const logs = await rpcs.next(chainId, from).getLogs({
      address,
      events,
      fromBlock: BigInt(from),
      toBlock: BigInt(to)
    })

    const throttle = 16
    for (const log of logs) {
      const path = `evmlogs/${chainId}/${address}/${log.topics[0]}/${log.blockNumber}-${log.logIndex}-${log.transactionHash}-${log.transactionIndex}.json`
      // console.log()
      // console.log('😪😪😪 chainId, address, from, to', chainId, address, from, to)
      // console.log('🥭🥭🥭 grove().store(path, log)', path)
      try {
        await grove().store(path, log)
      } catch(error) {
        console.log()
        console.log()
        console.log('logs')
        console.error(error)
        console.log()
        console.log()
      }

      await setTimeout(throttle)
    }

    for (const event of events) {
      const topic = toEventSelector(event)
      const prefix = `evmlogs/${chainId}/${address}/${topic}`
      // console.log()
      // console.log('💣💣💣 prefix, { from, to }', prefix, { from, to })
      try {
        await strides.store(prefix, { from, to })
      } catch(error) {
        console.log()
        console.log()
        console.log('strides')
        console.error(error)
        console.log()
        console.log()
      }

      await setTimeout(1000)
    }

    // await this.handlers[handler].handle(chainId, address, logs)
  }
}
