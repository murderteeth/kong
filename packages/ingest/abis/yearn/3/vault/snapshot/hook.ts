import { z } from 'zod'
import { parseAbi, zeroAddress } from 'viem'
import { rpcs } from '../../../../../rpcs'
import { ThingSchema, zhexstring } from 'lib/types'
import { mq } from 'lib'
import { estimateCreationBlock } from 'lib/blocks'

export const SnapshotSchema = z.object({
  accountant: zhexstring.optional(),
})

type Snapshot = z.infer<typeof SnapshotSchema>

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const snapshot = SnapshotSchema.parse(data)
  const fees = await extractFeesBps(chainId, address, snapshot)

  if (snapshot.accountant) {
    const incept = await estimateCreationBlock(chainId, snapshot.accountant)
    await mq.add(mq.q.load, mq.job.load.thing, ThingSchema.parse({
      chainId,
      address: snapshot.accountant,
      label: 'accountant',
      defaults: {
        inceptBlock: incept.number,
        inceptTime: incept.timestamp
      }
    }))
  }

  return { fees }
}

async function extractDebts() {
  // totalDebt from snapshot
  // get strategies lol
}

async function fetchDebtAllocator() {

}

export async function extractFeesBps(chainId: number, address: `0x${string}`, snapshot: Snapshot) {
  if(snapshot.accountant && snapshot.accountant !== zeroAddress) {
    const defaultConfig = await rpcs.next(chainId).readContract({
      address: snapshot.accountant,
      abi: parseAbi(['function defaultConfig() view returns (uint16, uint16, uint16, uint16, uint16, uint16)']),
      functionName: 'defaultConfig'
    })
    return {
      managementFee: defaultConfig[0],
      performanceFee: defaultConfig[1]
    }
  } else {
    const performanceFee = await rpcs.next(chainId).readContract({
      address,
      abi: parseAbi(['function performanceFee() view returns (uint16)']),
      functionName: 'performanceFee'
    })
    return {
      managementFee: 0,
      performanceFee: performanceFee
    }
  }
}
