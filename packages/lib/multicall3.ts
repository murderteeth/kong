import { mainnet, optimism, polygon, fantom, base, arbitrum } from 'viem/chains'

export const activations = {
  [mainnet.id]: 14353601n,
  [optimism.id]: 4286263n,
  [polygon.id]: 25770160n,
  [fantom.id]: 33001987n,
  [base.id]: 5022n,
  [arbitrum.id]: 7654707n
}

export function supportsBlock(chainId: number, blockNumber: bigint) {
  if(!Object.keys(activations).includes(chainId.toString())) {
    throw new Error(`Chain ${chainId} not supported`)
  }

  return blockNumber >= activations[chainId as keyof typeof activations]
}
