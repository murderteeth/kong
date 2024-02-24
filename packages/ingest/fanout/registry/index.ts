import { setTimeout } from 'timers/promises'
import { registries } from './registries'
import { chains, math, mq } from 'lib'
import { Queue } from 'bullmq'
import { Processor } from 'lib/processor'
import { getAddressPointer, getLatestBlock, setAddressPointer } from '../../db'
import { rpcs } from '../../rpcs'
import { parseAbi } from 'viem'

export default class RegistryFanout implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.extract] = mq.queue(mq.q.extract)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async fanout() {
    for(const chain of chains) {
      for(const registry of registries.filter(c => c.chainId === chain.id)) {
        if(registry.version >= 3) {
          await this.fanoutVaultExtract(chain.id, registry.address)

        } else {
          const blockPointer = await getAddressPointer(chain.id, registry.address)
          const from = math.max(blockPointer, registry.incept)
          const to = await getLatestBlock(chain.id)

          await this.fanoutEvmExtract(
          chain.id,
          registry.address,
          registry.events, 
          from, to)

          await setAddressPointer(chain.id, registry.address, to) 

        }
      }
    }
  }

  async fanoutEvmExtract(chainId: number, address: string, events: any, from: bigint, to: bigint) {
    console.log('🪭', 'fanout', chainId, address, from, to)
    const stride = BigInt(process.env.LOG_STRIDE || 10_000)
    const throttle = 16
    for (let block = from; block <= to; block += stride) {
      const toBlock = block + stride - 1n < to ? block + stride - 1n : to
      const options = {
        chainId, address,
        events: JSON.stringify(events),
        from: block, to: toBlock,
        handler: 'registry'
      }
      await this.queues[mq.q.extract].add(mq.job.extract.evmlog, options)
      await setTimeout(throttle)
    }
  }

  async fanoutVaultExtract(chainId: number, registry: `0x${string}`) {
    const multicallResult = await rpcs.next(chainId).multicall({ contracts: [
      {
        address: registry,
        functionName: 'numAssets',
        abi: parseAbi(['function numAssets() external view returns (uint256)'])
      },
      {
        address: registry,
        functionName: 'getAllEndorsedVaults',
        abi: parseAbi(['function getAllEndorsedVaults() view returns (address[][] memory)'])
      }
    ]})

    const numAssets = multicallResult[0].result as number | undefined
    const vaults = multicallResult[1].result as `0x${string}`[][] | undefined
    if(numAssets === undefined) throw new Error('!numAssets')
    if(vaults === undefined) throw new Error('!vaults')

    for(let i = 0; i < numAssets; i++) {
      for (const vault of vaults[i]) {
        await this.queues[mq.q.extract].add(mq.job.extract.vault, { 
          chainId, 
          address: vault,
          registryAddress: registry,
          registryStatus: 'endorsed'
        })
      }
    }
  }
}
