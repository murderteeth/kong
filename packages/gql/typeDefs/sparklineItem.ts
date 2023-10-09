import { gql } from 'apollo-server-express'

export default gql`
type SparklineItem {
  chainId: Int!
  address: String!
  type: String!
  value: Float!
  time: String!
}
`
