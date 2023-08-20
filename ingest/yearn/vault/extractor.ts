import { Queue, Worker } from 'bullmq'
import { mq, types } from 'lib'
import { parseAbi } from 'viem'
import { Processor } from '../../processor'
import { RpcClients, rpcs } from '../../rpcs'

export class VaultExtractor implements Processor {
  queue: Queue
  rpcs: RpcClients
  worker: Worker | undefined

  constructor() {
    this.queue = mq.queue(mq.q.vault.n)
    this.rpcs = rpcs.next()
  }

  async up() {
    this.worker = mq.worker(mq.q.vault.n, async job => {
      if(job.name !== mq.q.vault.extract) return
      const vault = job.data as types.Vault
      const rpc = this.rpcs[vault.chainId]
      const result = await rpc.multicall({
        contracts: [
          {
            address: vault.address,
            abi: parseAbi(['function name() returns (string)']),
            functionName: 'name'
          },
          {
            address: vault.address,
            abi: parseAbi(['function symbol() returns (string)']),
            functionName: 'symbol'
          },
          {
            address: vault.address,
            abi: parseAbi(['function decimals() returns (uint32)']),
            functionName: 'decimals'
          },
          {
            address: vault.address,
            abi: parseAbi(['function totalAssets() returns (uint256)']),
            functionName: 'totalAssets'
          },
          {
            address: vault.assetAddress,
            abi: parseAbi(['function name() returns (string)']),
            functionName: 'name'
          },
          {
            address: vault.assetAddress,
            abi: parseAbi(['function symbol() returns (string)']),
            functionName: 'symbol'
          },
        ]
      })

      const update = {
        ...vault,
        name: result[0].result,
        symbol: result[1].result,
        decimals: result[2].result,
        totalAssets: result[3].result?.toString(),
        assetName: result[4].result,
        assetSymbol: result[5].result,
      } as types.Vault

      await this.queue.add(mq.q.vault.load, update, {
        jobId: `${update.chainId}-${update.address}-${update.asOfBlockNumber}`
      })
    })
  }

  async down() {
    await this.queue.close()
    await this.worker?.close()
  }
}