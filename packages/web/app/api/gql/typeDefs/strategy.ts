import gql from 'graphql-tag'

export default gql`
type StrategyMeta {
  displayName: String
  description: String
  protocols: [String]
}

type Apr {
  gross: Float
  net: Float
}

type ReportDetail {
  chainId: Int
  address: String
  blockNumber: BigInt
  blockTime: BigInt
  profit: BigInt
  profitUsd: Float
  loss: BigInt
  lossUsd: Float
  apr: Apr
}

type Strategy {
  chainId: Int
  address: String
  apiVersion: String
  balanceOfWant: BigInt
  baseFeeOracle: String
  creditThreshold: BigInt
  crv: String
  curveVoter: String
  delegatedAssets: BigInt
  doHealthCheck: Boolean
  emergencyExit: Boolean
  estimatedTotalAssets: BigInt
  forceHarvestTriggerOnce: Boolean
  gauge: String
  healthCheck: String
  inceptTime: BigInt
  inceptBlock: BigInt
  isActive: Boolean
  isBaseFeeAcceptable: Boolean
  isOriginal: Boolean
  keeper: String
  localKeepCRV: BigInt
  maxReportDelay: BigInt
  metadataURI: String
  minReportDelay: BigInt
  name: String
  proxy: String
  rewards: String
  stakedBalance: BigInt
  strategist: String
  tradeFactory: String
  vault: String
  want: String
  DOMAIN_SEPARATOR: String
  FACTORY: String
  MAX_FEE: Int
  MIN_FEE: Int
  decimals: Int
  fullProfitUnlockDate: BigInt
  isShutdown: Boolean
  lastReport: BigInt
  lastReportDetail: ReportDetail
  management: String
  pendingManagement: String
  performanceFee: Int
  performanceFeeRecipient: String
  pricePerShare: BigInt
  profitMaxUnlockTime: BigInt
  profitUnlockingRate: BigInt
  symbol: String
  totalAssets: BigInt
  totalDebt: BigInt
  totalIdle: BigInt
  totalSupply: BigInt
  totalDebtUsd: Float
  lenderStatuses: [LenderStatus]
  claims: [Reward]
  risk: RiskScore
  meta: StrategyMeta
}
`
