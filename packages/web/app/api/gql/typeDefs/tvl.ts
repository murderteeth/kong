import gql from 'graphql-tag'

export default gql`
type Tvl {
  chainId: Int!
  address: String!
  period: String!
  time: BigInt!
  open: Float!
  high: Float!
  low: Float!
  close: Float!
}
`
