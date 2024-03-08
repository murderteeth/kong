import { z } from 'zod'
import { getAddress, zeroAddress } from 'viem'
import { zhexstring } from 'lib/types'
import { fetchErc20PriceUsd } from '../../../../../prices'
import { priced } from 'lib/math'

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
  return { totalDebtUsd }
}

async function computeTotalDebtUsd(chainId: number, snapshot: Snapshot) {
  if (borkedVaults.includes(getAddress(snapshot.vault))) return 0;
  if (snapshot.want === zeroAddress) return 0;
  const { priceUsd } = await fetchErc20PriceUsd(chainId, snapshot.want)
  return priced(snapshot.totalDebt, snapshot.decimals, priceUsd)
}
