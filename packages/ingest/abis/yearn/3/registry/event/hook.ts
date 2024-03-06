import { z } from 'zod'
import { mq } from 'lib'
import { parseAbi, toEventSelector } from 'viem'
import { rpcs } from 'lib/rpcs'
import { estimateHeight } from 'lib/blocks'
import { ThingSchema, zhexstring } from 'lib/types'

export const topics = [
  `event NewEndorsedVault(address indexed vault, address indexed asset, uint256 releaseVersion, uint256 vaultType)`
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const { vault, asset, vaultType } = z.object({
    vault: zhexstring,
    asset: zhexstring,
    vaultType: z.bigint({ coerce: true }).optional()
  }).parse(data.args)

  const label = vaultType === 1n ? 'vault': 'strategy'

  const multicall = await rpcs.next(chainId).multicall({ contracts: [
    {
      address, functionName: 'vaultInfo', args: [vault],
      abi: parseAbi(['function vaultInfo(address) view returns (address, uint96, uint128, uint128, string)'])
    },
    {
      address: vault, functionName: 'apiVersion',
      abi: parseAbi(['function apiVersion() view returns (string)'])
    },
    {
      address: asset, functionName: 'decimals',
      abi: parseAbi(['function decimals() view returns (uint256)'])
    }
  ]})

  if(multicall.some(r => r.error)) throw new Error(`multicall error, ${JSON.stringify(multicall)}`)

  const [vaultInfo, apiVersion, decimals] = multicall
  const inceptTime = vaultInfo!.result![3]
  const inceptBlock = await estimateHeight(chainId, inceptTime)
  await mq.add(mq.q.load, mq.job.load.thing, ThingSchema.parse({
    chainId,
    address: vault,
    label,
    defaults: {
      asset,
      decimals: decimals!.result!,
      apiVersion: apiVersion!.result!,
      registry: address,
      inceptBlock,
      inceptTime
    }
  }))
}