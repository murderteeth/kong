import gql from 'graphql-tag'

export default gql`
type Price {
  chainId: Int!
  address: String!
  priceUsd: Float!
  priceSource: String!
  blockNumber: BigInt!
  timestamp: BigInt!
}
`
