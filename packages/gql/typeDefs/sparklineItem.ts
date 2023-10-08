import { gql } from 'apollo-server-express'

export default gql`
type SparklineItem {
  chainId: Int!
  address: String!
  value: Float!
  time: String!
}
`
