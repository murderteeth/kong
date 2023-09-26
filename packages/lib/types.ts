export interface LatestBlock {
  chainId: number
  blockNumber: string
  blockTimestamp: string
  queueTimestamp: string
}

export interface Price {
  chainId: number
  address: string
  symbol: string
  priceUsd: number
  asOfBlockNumber: string
  asOfTime: string
}

export interface APR {
  chainId: number
  address: string
  grossApr: number
  netApr: number
  blockNumber: string
  blockTimestamp: string
}

export interface TVL {
  chainId: number
  address: string
  tvlUsd: number
  asOfBlockNumber: string
  asOfTime: string
}

export interface Vault {
  chainId: number
  address: `0x${string}`
  type?: 'vault' | 'strategy'
  apiVersion?: string
  apetaxType?: string
  apetaxStatus?: string
  registryStatus?: string
  registryAddress?: `0x${string}`
  symbol?: string,
  name?: string,
  decimals?: number,
  assetAddress?: `0x${string}`
  assetName?: string,
  assetSymbol?: string,
  totalAssets?: string,
  activationTimestamp?: string,
  activationBlockNumber?: string,
  asOfBlockNumber: string
}

export interface Strategy {
  chainId: number
  address: `0x${string}`
  apiVersion?: string
  name?: string,
  vaultAddress?: string,
  withdrawalQueueIndex?: number,
  migrateAddress?: string,
  activationTimestamp?: string,
  activationBlockNumber?: string,
  asOfBlockNumber: string
}

export interface WithdrawalQueueItem {
  chainId: number
  vaultAddress: `0x${string}`
  queueIndex: number
  strategyAddress?: `0x${string}`
  asOfBlockNumber: string
}

export interface ERC20 {
  chainId: number
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
}

export interface Transfer {
  chainId: number
  address: `0x${string}`
  sender: `0x${string}`
  receiver: `0x${string}`
  amount: string
  amountUsd?: number
  blockNumber: string
  blockIndex: number
  blockTimestamp: string
  transactionHash: `0x${string}`
}

export interface Harvest {
  chainId: number
  address: `0x${string}`
  profit: string
  profitUsd?: number
  loss: string
  lossUsd?: number
  totalProfit: string
  totalProfitUsd?: number
  totalLoss: string
  totalLossUsd?: number
  totalDebt?: string
  blockNumber: string
  blockIndex: number
  blockTimestamp: string
  transactionHash: `0x${string}`
}
