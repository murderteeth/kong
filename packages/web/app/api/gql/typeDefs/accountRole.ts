import gql from 'graphql-tag'

export default gql`
type AccountRole {
  chainId: Int!
  address: String!
  account: String!
  roleMask: BigInt!
}
`
