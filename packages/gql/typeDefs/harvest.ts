import { gql } from 'apollo-server-express'

export default gql`
type Harvest {
  chainId: Int!
  address: String!
  profit: Float!
  profitUsd: Float!
  loss: Float!
  lossUsd: Float!
  totalProfit: Float!
  totalProfitUsd: Float!
  totalLoss: Float!
  totalLossUsd: Float!
  totalDebt: Float!
  blockNumber: Int!
  blockIndex: Int!
  blockTimestamp: String!
  transactionHash: String!
}
`
