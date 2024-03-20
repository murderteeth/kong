import gql from 'graphql-tag'

export default gql`
type Transfer {
  chainId: Int!
  address: String!
  sender: String!
  receiver: String!
  value: Float!
  valueUsd: Float
  blockNumber: BigInt!
  blockTime: BigInt!
  logIndex: Int!
  transactionHash: String!
}
`
