import { Queue, Worker } from 'bullmq'
import { mq, types } from 'lib'
import { PublicClient, parseAbi } from 'viem'
import { mainnet } from 'viem/chains'
import { Processor } from '../../processor'
import { rpcs } from '../../rpcs'

export class VaultExtractor implements Processor {
  queue: Queue
  rpc: PublicClient
  worker: Worker | undefined

  constructor() {
    this.queue = mq.queue(mq.q.vault.n)
    this.rpc = rpcs.next(mainnet.id)
  }

  async up() {
    this.worker = mq.worker(mq.q.vault.n, async job => {
      if(job.name !== mq.q.vault.extract) return
      const vault = job.data as types.Vault
      const result = await this.rpc.multicall({
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
            address: vault.baseAssetAddress,
            abi: parseAbi(['function name() returns (string)']),
            functionName: 'name'
          },
          {
            address: vault.baseAssetAddress,
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
        baseAssetName: result[4].result,
        baseAssetSymbol: result[5].result,
      } as types.Vault

      await this.queue.add(mq.q.vault.load, update, {
        jobId: `${update.networkId}-${update.address}-${update.asOfBlockNumber}`
      })
    })
  }

  async down() {
    await this.queue.close()
    await this.worker?.close()
  }
}