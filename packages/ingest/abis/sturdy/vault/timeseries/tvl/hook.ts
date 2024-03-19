import { Output, OutputSchema } from 'lib/types'
import { Data } from '../../../../../extract/timeseries'
import { estimateHeight, getBlockTime } from 'lib/blocks'
import { rpcs } from '../../../../../rpcs'
import abi from '../../abi'
import { priced } from 'lib/math'

export const outputLabel = 'tvl'

export default async function process(chainId: number, address: `0x${string}`, data: Data): Promise<Output[]> {
  const blockNumber = await estimateHeight(chainId, data.blockTime)
  const blockTime = await getBlockTime(chainId, blockNumber)

  const multicall = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
    { abi, address, functionName: 'totalAssets' },
    { abi, address, functionName: 'decimals' }
  ], blockNumber})

  if (multicall.some(c => c.error)) throw new Error('!multicall')

  const totalAssets = multicall[0].result!
  const decimals = multicall[1].result!
  const price = 1 // =)
  const tvlUsd = priced(totalAssets, decimals, price)

  return OutputSchema.array().parse([{
    chainId, address, blockNumber, blockTime, label: data.outputLabel, 
    component: '', value: tvlUsd
  }])
}
