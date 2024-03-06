import { Processor } from 'lib/processor'
import { mq } from 'lib'
import { Contract, ContractSchema, SourceConfig, SourceConfigSchema } from 'lib/contracts'
import { rpcs } from 'lib/rpcs'
import { getBlock } from 'lib/blocks'
import { SnapshotSchema } from 'lib/types'
import { ResolveHooks } from '../abis/types'
import { requireHooks } from '../abis'
import abiutil from '../abiutil'

export class SnapshotExtractor implements Processor {
  resolveHooks: ResolveHooks|undefined

  async up() { this.resolveHooks = await requireHooks() }

  async down() {}

  async extract(data: { contract: Contract, source: SourceConfig }) {
    if(!this.resolveHooks) throw new Error('!resolveHooks')

    const { chainId, address } = SourceConfigSchema.parse(data.source)
    const { abiPath } = ContractSchema.parse(data.contract)

    const abi = await abiutil.load(abiPath)
    const fields = abiutil.fields(abi)

    const contracts = fields.map((f: any) => ({
      address, abi: [f], functionName: f.name
    }))

    const block = await getBlock(chainId)
    const multicall = await rpcs.next(chainId).multicall({ contracts, blockNumber: block.number })

    const _snapshot: { [key: string]: any } = {
      blockNumber: block.number,
      blockTime: block.timestamp
    }

    const kvps = fields.map((f: any, index: number) => ({ key: f.name, value: multicall[index].result }))
    for (const { key, value } of kvps) {
      _snapshot[key] = value
    }

    let hookResult = {}
    const hooks = this.resolveHooks(abiPath, 'snapshot')
    for (const hook of hooks) {
      try {
        hookResult = {
          ...hookResult,
          ...await hook.module.default(chainId, address, _snapshot)
        }
      } catch(error) {
        console.warn('🚨', 'hook fail', error)
      }
    }

    await mq.add(mq.q.load, mq.job.load.snapshot, SnapshotSchema.parse({
      chainId,
      address,
      snapshot: _snapshot,
      hook: hookResult,
      blockNumber: block.number,
      blockTime: block.timestamp
    }))
  }
}
