import { gql } from 'apollo-server-express'

export default gql`
type Strategy {
  chainId: Int!
  address: String!
  apiVersion: String!
  vaultAddress: String!
  name: String
  grossApr: Float
  netApr: Float
  activationTimestamp: String
  activationBlockNumber: String
  asOfBlockNumber: String
}
`
