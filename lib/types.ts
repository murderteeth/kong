export interface LatestBlock {
  chainId: number
  blockNumber: string
  blockTimestamp: string
  queueTimestamp: string
}

export interface Vault {
  chainId: number
  registry: `0x${string}`
  endorsed: boolean
  type: 'vault' | 'strategy'
  apiVersion: string
  address: `0x${string}`
  name?: string,
  symbol?: string,
  decimals?: number,
  totalAssets?: string,
  assetAddress: `0x${string}`
  assetName?: string,
  assetSymbol?: string,
  asOfBlockNumber: string
}
