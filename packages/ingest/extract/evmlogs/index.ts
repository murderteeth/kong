import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'
import { RegistryHandler } from './handlers/registry'
import { VaultHandler } from './handlers/vault'

export interface Handler extends Processor {
  handle: (chainId: number, address: `0x${string}`, logs: any[]) => Promise<void>
}

export class EvmLogsExtractor implements Processor {
  handlers = {
    registry: new RegistryHandler(),
    vault: new VaultHandler()
  } as { [key: string]: Handler }

  async up() {
    await Promise.all(Object.values(this.handlers).map(h => h.up()))
  }

  async down() {
    await Promise.all(Object.values(this.handlers).map(h => h.down()))
  }

  async extract(data: any) {
    const { chainId, address, events, from, to, handler } = data
    const logs = await rpcs.next(chainId).getLogs({
      address,
      events: JSON.parse(events),
      fromBlock: BigInt(from), toBlock: BigInt(to)
    })
    await this.handlers[handler].handle(chainId, address, logs)
  }
}
