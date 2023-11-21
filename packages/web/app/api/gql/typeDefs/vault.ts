import gql from 'graphql-tag'

export default gql`
type Vault {
  chainId: Int!
  address: String!
  apiVersion: String!
  apetaxType: String
  apetaxStatus: String
  registryStatus: String
  registryAddress: String
  symbol: String
  name: String
  decimals: Int
  totalAssets: BigInt
  availableDepositLimit: BigInt
  lockedProfitDegradation: BigInt
  totalDebt: String
  debtRatio: Int
  assetAddress: String
  assetSymbol: String
  assetName: String
  assetDescription: String
  withdrawalQueue: [Strategy]
  priceUsd: Float
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
  activationBlockTime: String
  activationBlockNumber: String
  asOfBlockNumber: String
}
`
