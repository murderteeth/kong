import { z } from 'zod'

export const zaddress = z.custom<`0x${string}`>((val: any) => /^0x/.test(val))
export const zvaultType = z.enum(['vault', 'strategy'])

export interface LatestBlock {
  chainId: number
  blockNumber: bigint
  blockTime: bigint
}

export interface APR {
  chainId: number
  address: string
  gross: number
  net: number
  blockNumber: bigint
  blockTime: bigint
}

export interface APY {
  chainId: number
  address: `0x${string}`
  weeklyNet: number,
  weeklyPricePerShare: bigint,
  weeklyBlockNumber: bigint,
  monthlyNet: number,
  monthlyPricePerShare: bigint,
  monthlyBlockNumber: bigint,
  inceptionNet: number,
  inceptionPricePerShare: bigint,
  inceptionBlockNumber: bigint
  net: number
  grossApr: number
  pricePerShare: bigint
  blockNumber: bigint
  blockTime: bigint
}

export interface TVL {
  chainId: number
  address: string
  tvlUsd: number
  blockNumber: bigint
  blockTime: bigint
}

export const VaultSchema = z.object({
  chainId: z.number(),
  address: zaddress,
  type: zvaultType.optional(),
  apiVersion: z.string().optional(),
  apetaxType: z.string().optional(),
  apetaxStatus: z.string().optional(),
  registryStatus: z.string().optional(),
  registryAddress: zaddress.optional(),
  symbol: z.string().optional(),
  name: z.string().optional(),
  decimals: z.number().optional(),
  assetAddress: zaddress.optional(),
  assetName: z.string().optional(),
  assetSymbol: z.string().optional(),
  totalAssets: z.bigint().optional(),
  totalDebt: z.bigint().optional(),
  totalIdle: z.bigint().optional(),
  minimumTotalIdle: z.bigint().optional(),
  debtRatio: z.number().optional(),
  availableDepositLimit: z.bigint().optional(),
  depositLimit: z.bigint().optional(),
  governance: zaddress.optional(),
  performanceFee: z.number().optional(),
  managementFee: z.number().optional(),
  lockedProfitDegradation: z.bigint().optional(),
  profitMaxUnlockTime: z.bigint().optional(),
  profitUnlockingRate: z.bigint().optional(),
  fullProfitUnlockDate: z.bigint().optional(),
  lastProfitUpdate: z.bigint().optional(),
  accountant: zaddress.optional(),
  roleManager: zaddress.optional(),
  emergencyShutdown: z.boolean().optional(),
  isShutdown: z.boolean().optional(),
  activationBlockTime: z.bigint().optional(),
  activationBlockNumber: z.bigint().optional(),
  asOfBlockNumber: z.bigint()
})

export type Vault = z.infer<typeof VaultSchema>

export interface Strategy {
  chainId: number
  address: `0x${string}`
  vaultAddress: `0x${string}`,
  apiVersion?: string
  name?: string,
  assetAddress?: `0x${string}`
  estimatedTotalAssets?: bigint,
  delegatedAssets?: bigint,
  performanceFee?: number,
  debtRatio?: number,
  minDebtPerHarvest?: bigint,
  maxDebtPerHarvest?: bigint,
  lastReportBlockTime?: bigint,
  totalDebt?: bigint,
  totalDebtUsd?: number,
  totalGain?: bigint,
  totalLoss?: bigint,
  withdrawalQueueIndex?: number,
  migrateAddress?: `0x${string}`,
  strategist?: `0x${string}`,
  keeper?: `0x${string}`,
  healthCheck?: `0x${string}`,
  doHealthCheck?: boolean,
  tradeFactory?: `0x${string}`,
  activationBlockTime?: bigint,
  activationBlockNumber?: bigint,
  asOfBlockNumber: bigint
}

export interface StrategyLenderStatus {
  chainId: number
  strategyAddress: `0x${string}`
  name: string
  assets: bigint
  rate: number
  address: `0x${string}`
  asOfBlockNumber: bigint
}

export interface WithdrawalQueueItem {
  chainId: number
  vaultAddress: `0x${string}`
  queueIndex: number
  strategyAddress?: `0x${string}`
  asOfBlockNumber: bigint
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
  blockTime: string
  transactionHash: `0x${string}`
}

export interface RiskGroup {
  name: string
  auditScore: number,
  codeReviewScore: number,
  complexityScore: number,
  protocolSafetyScore: number,
  teamKnowledgeScore: number,
  testingScore: number,
  strategies: `0x${string}` []
}

export const HarvestSchema = z.object({
  chainId: z.number(),
  address: zaddress,
  profit: z.bigint({ coerce: true }),
  profitUsd: z.number({ coerce: true }).optional(),
  loss: z.bigint({ coerce: true }),
  lossUsd: z.number({ coerce: true }).optional(),
  totalProfit: z.bigint({ coerce: true }).optional(),
  totalProfitUsd: z.number({ coerce: true }).optional(),
  totalLoss: z.bigint({ coerce: true }).optional(),
  totalLossUsd: z.number({ coerce: true }).optional(),
  totalDebt: z.bigint({ coerce: true }).optional(),
  protocolFees: z.bigint({ coerce: true }).optional(),
  protocolFeesUsd: z.number({ coerce: true }).optional(),
  performanceFees: z.bigint({ coerce: true }).optional(),
  performanceFeesUsd: z.number({ coerce: true }).optional(),
  blockNumber: z.bigint({ coerce: true }),
  blockIndex: z.number({ coerce: true }),
  blockTime: z.bigint({ coerce: true }).optional(),
  transactionHash: zaddress
})

export type Harvest = z.infer<typeof HarvestSchema>

export interface SparklinePoint {
  chainId: number
  address: `0x${string}`
  type: string
  value: number
  time: string
}
