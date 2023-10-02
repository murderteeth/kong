import { gql } from 'apollo-server-express'

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
  blockTimestamp: String!
  transactionHash: String!
}
`
