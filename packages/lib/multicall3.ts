import { mainnet, optimism } from 'viem/chains'

const activations = {
  [mainnet.id]: 14353601n
}

export function supportsBlock(chainId: number, blockNumber: bigint) {
  if(!Object.keys(activations).includes(chainId.toString())) {
    throw new Error(`Chain ${chainId} not supported`)
  }

  return blockNumber >= activations[chainId as keyof typeof activations]
}
