import { rpcs } from './rpcs'

export async function estimateHeight(chainId: number, timestamp: number) {
  try {
    return await estimateHeightLlama(chainId, timestamp)
  } catch(error) {
    console.warn('🚨', 'estimateHeightLlama failed, trying estimateHeightManual')
    return await estimateHeightManual(chainId, timestamp)
  }
}

async function estimateHeightLlama(chainId: number, timestamp: number) {
	const chain = (rpcs.nextAll()[chainId]?.chain?.name as string).toLowerCase()
	const response = await fetch(`https://coins.llama.fi/block/${chain}/${timestamp}`, {
		headers: {accept: 'application/json'}
	});
	const { height } = await response.json();
	return height;
}

async function estimateHeightManual(chainId: number, timestamp: number) {
  const top = await rpcs.next(chainId).getBlock()
  let hi = top.number
  let lo = 0n
  let block = top

  while ((hi - lo) > 1n) {
    const mid = (hi + lo) / 2n
    block = await rpcs.next(chainId).getBlock({ blockNumber: mid })
    if (block.timestamp < timestamp) {
      lo = mid + 1n
    } else {
      hi = mid - 1n
    }
  }

  return block.number
}

// use bin search to estimate contract creat block
// doesn't account for CREATE2 or SELFDESTRUCT
// adapted from https://github.com/BobTheBuidler/ypricemagic/blob/5ba16b25302b47539b4e5a996554ba4c0a70e7c7/y/contracts.py#L68
export async function estimateCreationBlock(chainId: number, contract: `0x${string}`) {
  let counter = 0
  console.time()
  const height = await rpcs.next(chainId).getBlockNumber()
  let lo = 0n, hi = height, mid = lo + (hi - lo) / 2n
  while (hi - lo > 1n) {
    const bytecode = await rpcs.next(chainId).getBytecode({ address: contract, blockNumber: mid })
    if(!bytecode || bytecode.length === 0) { lo = mid } else { hi = mid }
    mid = lo + (hi - lo) / 2n
    counter++
  }
  console.log('💥', 'estimateCreationBlock', chainId, contract, counter, hi)
  console.timeEnd()
  return await rpcs.next(chainId).getBlock({ blockNumber: hi })
}
