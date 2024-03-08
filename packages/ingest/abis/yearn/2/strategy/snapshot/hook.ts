import { z } from 'zod'
import { ContractFunctionExecutionError, getAddress, parseAbi, zeroAddress } from 'viem'
import { zhexstring } from 'lib/types'
import { fetchErc20PriceUsd } from '../../../../../prices'
import { priced } from 'lib/math'
import { rpcs } from '../../../../../rpcs'

const borkedVaults = [
  '0x718AbE90777F5B778B52D553a5aBaa148DD0dc5D'
]

const SnapshotSchema = z.object({
  vault: zhexstring,
  want: zhexstring,
  decimals: z.number(),
  totalDebt: z.bigint({ coerce: true })
})

export type Snapshot = z.infer<typeof SnapshotSchema>

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const snapshot = SnapshotSchema.parse(data)
  const totalDebtUsd = await computeTotalDebtUsd(chainId, snapshot)
  const lenderStatuses = await extractLenderStatuses(chainId, address)
  return { totalDebtUsd, lenderStatuses }
}

async function computeTotalDebtUsd(chainId: number, snapshot: Snapshot) {
  if (borkedVaults.includes(getAddress(snapshot.vault))) return 0;
  if (snapshot.want === zeroAddress) return 0;
  const { priceUsd } = await fetchErc20PriceUsd(chainId, snapshot.want)
  return priced(snapshot.totalDebt, snapshot.decimals, priceUsd)
}

export async function extractLenderStatuses(chainId: number, address: `0x${string}`, blockNumber?: bigint) {
  try {
    return (await rpcs.next(chainId, blockNumber).readContract({
      address, functionName: 'lendStatuses', 
      abi: parseAbi([
        'struct lendStatus { string name; uint256 assets; uint256 rate; address add; }',
        'function lendStatuses() view returns (lendStatus[])'
      ]),
      blockNumber
    })).map(status => ({
      name: status.name,
      assets: status.assets,
      rate: status.rate,
      address: status.add
    }))

  } catch(error) {
    if(error instanceof ContractFunctionExecutionError) return []
    throw error

  }
}
