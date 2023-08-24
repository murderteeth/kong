import { PublicClient } from 'viem'

export async function estimateHeight(rpc: PublicClient, timestamp: number) {
  const top = await rpc.getBlock()
  let hi = top.number
  let lo = 0n
  let block = top

  while ((hi - lo) > 1n) {
    const mid = (hi + lo) / 2n
    block = await rpc.getBlock({blockNumber: mid})
    if (block.timestamp < timestamp) {
      lo = mid + 1n
    } else {
      hi = mid - 1n
    }
  }

  return block.number
}
