import gql from 'graphql-tag'

export default gql`
type Transfer {
  chainId: Int!
  address: String!
  sender: String!
  receiver: String!
  amount: Float!
  amountUsd: Float!
  blockNumber: Int!
  blockIndex: Int!
  blockTime: BigInt!
  transactionHash: String!
}
`
