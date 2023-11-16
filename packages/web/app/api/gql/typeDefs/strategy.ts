import gql from 'graphql-tag'

export default gql`
type Strategy {
  chainId: Int!
  address: String!
  apiVersion: String!
  vaultAddress: String!
  name: String
  grossApr: Float
  netApr: Float
  estimatedTotalAssets: BigInt
  delegatedAssets: BigInt
  assetAddress: String
  performanceFee: Int
  debtRatio: Int
  minDebtPerHarvest: BigInt
  maxDebtPerHarvest: BigInt
  lastReportBlockTime: String
  totalDebt: BigInt
  totalDebtUsd: Float
  totalGain: BigInt
  totalLoss: BigInt
  withdrawalQueueIndex: Int
  keeper: String
  strategist: String
  healthCheck: String
  doHealthCheck: Boolean
  tradeFactory: String
  description: String
  riskGroup: String
  activationBlockTime: String
  activationBlockNumber: String
  asOfBlockNumber: String
}
`
