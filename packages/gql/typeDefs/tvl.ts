import { gql } from 'apollo-server-express'

export default gql`
type Tvl {
  chainId: Int!
  address: String!
  period: String!
  time: String!
  open: Float!
  high: Float!
  low: Float!
  close: Float!
}
`
