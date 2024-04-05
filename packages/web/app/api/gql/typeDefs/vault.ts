import gql from 'graphql-tag'

export default gql`
type VaultMeta {
  displayName: String
  displaySymbol: String
  description: String
  protocols: [String]
}

type Debt {
  strategy: String
  performanceFee: BigInt
  activation: BigInt
  debtRatio: BigInt
  minDebtPerHarvest: BigInt
  maxDebtPerHarvest: BigInt
  lastReport: BigInt
  totalDebt: BigInt
  totalDebtUsd: Float
  totalGain: BigInt
  totalGainUsd: Float
  totalLoss: BigInt
  totalLossUsd: Float
  currentDebt: BigInt
  currentDebtUsd: Float
  maxDebt: BigInt
  maxDebtUsd: Float
  targetDebtRatio: Float
  maxDebtRatio: Float
}

type Fees {
  managementFee: Float
  performanceFee: Float
}

type Vault {
  DOMAIN_SEPARATOR: String
  FACTORY: String
  accountant: String
  activation: BigInt
  address: String
  apiVersion: String
  asset: Erc20
  availableDepositLimit: BigInt
  chainId: Int
  creditAvailable: BigInt
  debtOutstanding: BigInt
  debtRatio: BigInt 
  decimals: BigInt
  depositLimit: BigInt 
  deposit_limit: BigInt
  deposit_limit_module: String
  emergencyShutdown: Boolean
  expectedReturn: BigInt
  fullProfitUnlockDate: BigInt
  future_role_manager: String
  get_default_queue: [String]
  governance: String
  guardian: String
  isShutdown: Boolean
  lastProfitUpdate: BigInt
  lastReport: BigInt
  lockedProfit: BigInt
  lockedProfitDegradation: BigInt
  management: String
  managementFee: BigInt
  maxAvailableShares: BigInt
  minimum_total_idle: BigInt
  name: String
  performanceFee: BigInt
  pricePerShare: BigInt
  profitMaxUnlockTime: BigInt
  profitUnlockingRate: BigInt
  rewards: String
  role_manager: String
  symbol: String
  token: String
  totalAssets: BigInt
  totalDebt: BigInt
  totalIdle: BigInt
  totalSupply: BigInt
  total_supply: BigInt
  unlockedShares: BigInt
  use_default_queue: Boolean
  withdraw_limit_module: String
  withdrawalQueue: [String]
  strategies: [String]
  allocator: String
  debts: [Debt]
  fees: Fees
  risk: RiskScore
  meta: VaultMeta
  sparklines: Sparklines
}
`
