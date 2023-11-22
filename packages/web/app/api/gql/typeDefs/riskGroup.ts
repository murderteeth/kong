import gql from 'graphql-tag'

export default gql`
type RiskGroup {
  chainId: Int!
  name: String!
  auditScore: Int!
  codeReviewScore: Int!
  complexityScore: Int!
  protocolSafetyScore: Int!
  longevityScore: Int!
  teamKnowledgeScore: Int!
  testingScore: Int!
}
`
