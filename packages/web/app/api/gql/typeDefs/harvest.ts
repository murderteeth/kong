import gql from 'graphql-tag'

export default gql`
type Harvest {
  chainId: Int!
  address: String!
  profit: BigInt!
  profitUsd: Float
  loss: BigInt!
  lossUsd: Float
  aprGross: Float
  aprNet: Float
  blockNumber: Int!
  blockTime: BigInt!
  logIndex: Int!
  transactionHash: String!
}
`
