export interface LatestBlock {
  chainId: number
  blockNumber: string
  blockTimestamp: string
  queueTimestamp: string
}

export interface Vault {
  chainId: number

  apetaxType: string
  apeTaxStatus: string
  registryStatus: string
  registryAddress: `0x${string}`

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
