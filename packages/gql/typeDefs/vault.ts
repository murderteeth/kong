import { gql } from 'apollo-server-express'

export default gql`
type Tvl {
  open: Float!
  high: Float!
  low: Float!
  close: Float!
  period: String!
  time: String!
}

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
  assetAddress: String
  assetSymbol: String
  assetName: String
  withdrawalQueue: [Strategy]
  activationTimestamp: String
  activationBlockNumber: String
  asOfBlockNumber: String
  tvlSparkline: [Tvl]
}
`
