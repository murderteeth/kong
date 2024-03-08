import { z } from 'zod'
import { mq } from 'lib'
import { toEventSelector } from 'viem'
import { estimateCreationBlock, getBlockTime } from 'lib/blocks'
import { ThingSchema, zhexstring } from 'lib/types'
import { extractDecimals } from '../../../lib'

export const topics = [
  `event NewVault(address indexed token, uint256 indexed deployment_id, address vault, string api_version)`,
  `event NewExperimentalVault(address indexed token, address indexed deployer, address vault, string api_version)`
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const { vault, token, api_version } = z.object({
    vault: zhexstring,
    token: zhexstring,
    api_version: z.string()
  }).parse(data.args)

  const decimals = await extractDecimals(chainId, token)
  const block = await estimateCreationBlock(chainId, vault)
  const inceptBlock = block.number
  const inceptTime = await getBlockTime(chainId, inceptBlock)
  await mq.add(mq.q.load, mq.job.load.thing, ThingSchema.parse({
    chainId,
    address: vault,
    label: 'vault',
    defaults: {
      apiVersion: api_version,
      registry: address,
      asset: token,
      decimals,
      inceptBlock,
      inceptTime
    }
  }))
}
