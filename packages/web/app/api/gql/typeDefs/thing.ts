import gql from 'graphql-tag'

export default gql`
type Thing {
  chainId: Int!
  address: String!
  label: String!
}
`
