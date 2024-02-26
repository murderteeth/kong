import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { abiutil, mq } from 'lib'
import { Contract, ContractSchema, SourceConfig, SourceConfigSchema } from 'lib/contracts'
import { rpcs } from 'lib/rpcs'
import { getBlock } from 'lib/blocks'
import grove from 'lib/grove'

export class SnapshotExtractor implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async extract(data: { contract: Contract, source: SourceConfig }) {
    const { chainId, address } = SourceConfigSchema.parse(data.source)
    const { abi: abiPath } = ContractSchema.parse(data.contract)

    const abi = await abiutil.load(abiPath)
    const fields = abiutil.fields(abi)

    const contracts = fields.map((f: any) => ({ 
      address, abi: [f], functionName: f.name
    }))

    const block = await getBlock(chainId)
    const multicall = await rpcs.next(chainId).multicall({ contracts, blockNumber: block.number })

    const _snapshot: { [key: string]: any } = {}
    const kvps = fields.map((f: any, index: number) => ({ key: f.name, value: multicall[index].result }))
    for (const { key, value } of kvps) {
      _snapshot[key] = value
    }

    const snapshot = { 
      chainId,
      address,
      snapshot: _snapshot,
      blockNumber: block.number,
      blockTime: block.timestamp
    }

    await grove().store(`snapshot/${chainId}/${address}/latest.json`, snapshot)
    this.queues[mq.q.load].add(mq.job.load.snapshot, snapshot)
  }
}
