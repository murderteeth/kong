import gql from 'graphql-tag'

export default gql`
type Vault {
  chainId: Int!
  address: String!
  type: String!
  apiVersion: String!
  apetaxType: String
  apetaxStatus: String
  registryStatus: String
  registryAddress: String
  symbol: String
  name: String
  decimals: Int
  totalAssets: BigInt
  depositLimit: BigInt
  availableDepositLimit: BigInt
  lockedProfitDegradation: BigInt
  totalDebt: String
  currentDebt: String
  currentDebtRatio: Float
  debtRatio: Int
  totalIdle: BigInt
  assetAddress: String
  assetSymbol: String
  assetName: String
  assetDescription: String
  assetPriceUsd: Float
  assetPriceSource: String
  defaultQueue: [Vault]
  withdrawalQueue: [Strategy]
  tvlUsd: Float
  tvlSparkline: [SparklineItem]
  apyNet: Float
  apyWeeklyNet: Float
  apyMonthlyNet: Float
  apyInceptionNet: Float
  aprGross: Float
  apySparkline: [SparklineItem]
  managementFee: Float
  performanceFee: Float
  governance: String
  latestReportBlockTime: BigInt
  keeper: String
  doHealthCheck: Boolean
  activationBlockTime: BigInt
  activationBlockNumber: BigInt
}
`
