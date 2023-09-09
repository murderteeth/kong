import { Processor } from 'lib/processor'
import { RpcClients, rpcs } from '../../../rpcs'
import { Queue } from 'bullmq'
import { mq, types } from 'lib'
import { estimateHeight } from 'lib/blocks'
import db from '../../../db'
import { parseAbi } from 'viem'

const oracle = '0x9b8b9F6146B29CC32208f42b995E70F0Eb2807F3' as `0x${string}`

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

    const multicallResult = await rpc.multicall({ contracts: [
      {
        address: oracle,
        functionName: 'getPriceUsdcRecommended' as never,
        args: [ assetAddress ],
        abi: parseAbi(['function getPriceUsdcRecommended(address tokenAddress) view returns (uint256)'])
      },
      {
        address,
        functionName: 'totalAssets' as never,
        abi: parseAbi(['function totalAssets() view returns (uint256)'])
      }
    ], blockNumber: asOfBlockNumber })

    const priceUSDC = (multicallResult[0].result || 0n) as bigint
    const totalAssets = (multicallResult[1].result || 0n) as bigint

    const priceUsd = Number(priceUSDC * 10_000n / BigInt(10 ** 6)) / 10_000
    const assets = Number(totalAssets * 10_000n / BigInt(10 ** decimals)) / 10_000
    const tvlUsd = priceUsd * assets

    await this.queue?.add(mq.q.tvl.loadJobs.tvl, {
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
      api_version as "apiVersion",
      asset_address as "assetAddress",
      decimals
    FROM vault
    WHERE chain_id = $1 AND address = $2
  `, [chainId, address])
  return result.rows[0] as {
    apiVersion: string,
    assetAddress: `0x${string}`, 
    decimals: number
  }
}
