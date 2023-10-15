import { gql } from 'apollo-server-express'

export default gql`
type Apy {
  chainId: Int!
  address: String!
  period: String!
  time: String!
  average: Float!
}
`
