import { Processor } from 'lib/processor'
import { RpcClients, rpcs } from 'lib/rpcs'
import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { estimateHeight } from 'lib/blocks'
import db from '../../../db'
import { parseAbi } from 'viem'
import { fetchErc20PriceUsd } from 'lib/prices'

export class TvlExtractor implements Processor {
  rpcs : RpcClients = rpcs.next()
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.tvl.load)
  }

  async down() {
    await this.queue?.close()
  }

  async extract(job: any) {
    const { chainId, address, time } = job.data
    const rpc = this.rpcs[chainId]
    console.log('⬇️ ', job.queueName, job.name, chainId, address, time)

    const asOfBlockNumber = await estimateHeight(rpc, time)
    const { assetAddress, decimals } = await getAsset(chainId, address)

    const totalAssets = await rpc.readContract({
      address,
      functionName: 'totalAssets' as never,
      abi: parseAbi(['function totalAssets() view returns (uint256)']),
      blockNumber: asOfBlockNumber
    }) as bigint

    const { price: assetPriceUsd } = await fetchErc20PriceUsd(rpc, assetAddress, asOfBlockNumber)
    const assets = Number(totalAssets * 10_000n / BigInt(10 ** decimals)) / 10_000
    const tvlUsd = assetPriceUsd * assets

    await this.queue?.add(mq.q.noJobName, {
      chainId,
      address,
      tvlUsd,
      asOfBlockNumber: asOfBlockNumber.toString(),
      asOfTime: time.toString()
    } as types.TVL)
  }
}

export async function getAsset(chainId: number, address: string) {
  const result = await db.query(`
    SELECT 
      asset_address as "assetAddress",
      decimals
    FROM vault
    WHERE chain_id = $1 AND address = $2
  `, [chainId, address])
  return result.rows[0] as {
    assetAddress: `0x${string}`, 
    decimals: number
  }
}
