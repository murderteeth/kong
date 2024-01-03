import gql from 'graphql-tag'

export default gql`
type Harvest {
  chainId: Int!
  address: String!
  profit: BigInt!
  profitUsd: Float!
  loss: BigInt!
  lossUsd: Float!
  totalProfit: BigInt!
  totalProfitUsd: Float!
  totalLoss: BigInt!
  totalLossUsd: Float!
  totalDebt: BigInt!
  blockNumber: Int!
  blockIndex: Int!
  blockTime: BigInt!
  transactionHash: String!
  aprGross: Float
  aprNet: Float
}
`
