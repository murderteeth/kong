import { PublicClient } from 'viem'

export async function estimateHeight(rpc: PublicClient, timestamp: number) {
  try {
    return await llama(rpc, timestamp)
  } catch(error) {
    console.log('🤬', error)
    return await manual(rpc, timestamp)
  }
}

async function llama(rpc: PublicClient, timestamp: number) {
	const chain = (rpc.chain?.name as string).toLowerCase()
	const response = await fetch(`https://coins.llama.fi/block/${chain}/${timestamp}`, {
		headers: {accept: 'application/json'}
	});
	const {height} = await response.json();
	return height;
}

async function manual(rpc: PublicClient, timestamp: number) {
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