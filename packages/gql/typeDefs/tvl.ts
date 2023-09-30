import { gql } from 'apollo-server-express'

export default gql`
type Tvl {
  open: Float!
  high: Float!
  low: Float!
  close: Float!
  period: String!
  time: String!
}
`
