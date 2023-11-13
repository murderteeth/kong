import { gql } from 'apollo-server-express'

export default gql`
type Strategy {
  chainId: Int!
  address: String!
  apiVersion: String!
  vaultAddress: String!
  name: String
  grossApr: Float
  netApr: Float
  estimatedTotalAssets: String
  delegatedAssets: String
  assetAddress: String
  performanceFee: Int
  debtRatio: Int
  minDebtPerHarvest: String
  maxDebtPerHarvest: String
  lastReportBlockTime: String
  totalDebt: String
  totalDebtUsd: String
  totalGain: String
  totalLoss: String
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
