export interface LatestBlock {
  networkId: number
  blockNumber: string
  blockTimestamp: string
  queueTimestamp: string
}

export interface Vault {
  networkId: number
  address: `0x${string}`
  apiVersion: string
  name?: string,
  symbol?: string,
  decimals?: number,
  totalAssets?: string,
  baseAssetAddress: `0x${string}`
  baseAssetName?: string,
  baseAssetSymbol?: string,
  asOfBlockNumber: string
}