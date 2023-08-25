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
  activationTimestamp?: string,
  activationBlockNumber?: string,
  asOfBlockNumber: string
}

export interface Strategy {
  chainId: number
  address: `0x${string}`
  apiVersion: string
  name?: string,
  vaultAddress?: string,
  withdrawalQueueIndex?: number,
  migrateAddress?: string,
  activationTimestamp?: string,
  activationBlockNumber?: string,
  asOfBlockNumber: string
}
