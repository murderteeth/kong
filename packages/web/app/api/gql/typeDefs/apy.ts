import gql from 'graphql-tag'

export default gql`
type Apy {
  chainId: Int!
  address: String!
  period: String!
  time: BigInt!
  average: Float!
}
`
