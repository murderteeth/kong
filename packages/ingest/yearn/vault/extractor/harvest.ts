import { Processor } from 'lib/processor'
import { rpcs } from 'lib/rpcs'
import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import db from '../../../db'
import { fetchErc20PriceUsd } from 'lib/prices'
import { numberToBytes, parseAbi } from 'viem'

export class HarvestExtractor implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.load.name)
  }

  async down() {
    await this.queue?.close()
  }

  async extract(job: any) {
    const harvest = job.data as types.Harvest
    console.log('⬇️ ', job.queueName, job.name, harvest.chainId, harvest.blockNumber, harvest.blockIndex, harvest.address)

    const block = await rpcs.next(harvest.chainId).getBlock({ blockNumber: BigInt(harvest.blockNumber) })

    const asset = await getAsset(harvest.chainId, harvest.address)
    if(!asset) { 
      console.warn('🚨', 'no asset', harvest.chainId, harvest.address)
      return
    }

    const { price: assetPriceUsd } = await fetchErc20PriceUsd(harvest.chainId, asset.address, BigInt(harvest.blockNumber))
    const gain = Number(BigInt(harvest.gain) * 10_000n / BigInt(10 ** Number(asset.decimals))) / 10_000
    const gainUsd = gain * assetPriceUsd

    await this.queue?.add(mq.q.load.jobs.harvest, {
      batch: [{
        ...harvest,
        gainUsd,
        blockTimestamp: block.timestamp.toString()
      }]
    })
  }
}

export async function getAsset(chainId: number, address: `0x${string}`) {
  const result = await db.query(`
    SELECT 
      asset_address as "assetAddress",
      decimals
    FROM vault
    WHERE chain_id = $1 AND address = $2
    UNION SELECT
      v.asset_address as "assetAddress",
      v.decimals
    FROM vault v
    JOIN strategy s ON s.vault_address = v.address
    WHERE s.chain_id = $1 AND s.address = $2
  `, [chainId, address])
  if(result.rows.length > 0) {
    return result.rows[0] as {
      address: `0x${string}`, 
      decimals: number
    }
  }

  const want = await rpcs.next(chainId).readContract({
    address, 
    functionName: 'want' as never,
    abi: parseAbi(['function want() returns (address)'])
  }) as `0x${string}`

  if(want) {
    const decimals = await rpcs.next(chainId).readContract({
      address: want,
      functionName: 'decimals' as never,
      abi: parseAbi(['function decimals() returns (uint256)'])
    }) as number
    return {
      address: want,
      decimals
    }
  }

  return null
}
