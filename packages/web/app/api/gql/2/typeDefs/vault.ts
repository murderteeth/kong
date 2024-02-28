import gql from 'graphql-tag'

export default gql`
type Vault {
  chainId: Int!
  address: String!
  apiVersion: String!
  name: String!
  registryAddress: String
  inceptBlockNumber: BigInt
  inceptBlockTime: BigInt
}
`
