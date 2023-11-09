import { gql } from 'apollo-server-express'

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
  totalAssets: String
  availableDepositLimit: String
  assetAddress: String
  assetSymbol: String
  assetName: String
  withdrawalQueue: [Strategy]
  priceUsd: Float
  tvlUsd: Float
  tvlSparkline: [SparklineItem]
  apyNet: Float
  apySparkline: [SparklineItem]
  managementFee: Float
  performanceFee: Float
  governance: String
  activationBlockTime: String
  activationBlockNumber: String
  asOfBlockNumber: String
}
`
