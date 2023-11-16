import gql from 'graphql-tag'

export default gql`
type SparklineItem {
  chainId: Int!
  address: String!
  type: String!
  value: Float!
  time: String!
}
`
