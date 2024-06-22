import gql from 'graphql-tag'

export default gql`
type Tvl {
  chainId: Int!
  address: String!
  value: Float!
  price: Float!
  priceSource: String!
  period: String!
  time: BigInt
}
`
