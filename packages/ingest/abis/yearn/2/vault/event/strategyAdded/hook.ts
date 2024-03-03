import { z } from 'zod'
import { parseAbi, toEventSelector } from 'viem'
import { ThingSchema, zhexstring } from 'lib/types'
import { estimateCreationBlock, getBlockTime } from 'lib/blocks'
import { mq } from 'lib'
import { rpcs } from '../../../../../../rpcs'
import { extractDecimals, fetchAsset } from '../../../lib'

export const topics = [
  `event StrategyAdded(address indexed strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)`,
  `event StrategyMigrated(address indexed oldVersion, address indexed newVersion)`
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const vault = address
  const { strategy, newVersion } = z.object({
    strategy: zhexstring.optional(),
    newVersion: zhexstring.optional()
  }).parse(data.args)

  const newStrategy = (strategy || newVersion)!

  const apiVersion = await rpcs.next(chainId).readContract({
    address: newStrategy,
    functionName: 'apiVersion',
    abi: parseAbi(['function apiVersion() view returns (string)'])
  })

  const asset = await fetchAsset(chainId, vault, 'vault')
  const decimals = await extractDecimals(chainId, vault)
  const block = await estimateCreationBlock(chainId, newStrategy)
  const inceptBlock = block.number
  const inceptTime = await getBlockTime(chainId, inceptBlock)
  await mq.add(mq.q.load, mq.job.load.thing, ThingSchema.parse({
    chainId,
    address: strategy,
    label: 'strategy',
    defaults: {
      vault,
      asset,
      decimals,
      apiVersion,
      inceptBlock,
      inceptTime
    }
  }))
}
