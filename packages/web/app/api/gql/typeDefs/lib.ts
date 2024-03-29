import gql from 'graphql-tag'

export default gql`
type Reward {
  token: String
  balance: BigInt
  balanceUsd: Float
}

type LenderStatus {
  name: String
  assets: BigInt
  rate: BigInt
  address: String
}

type RiskScore {
  label: String
  auditScore: Float
  codeReviewScore: Float
  complexityScore: Float
  protocolSafetyScore: Float
  teamKnowledgeScore: Float
  testingScore: Float
}

type TokenMeta {
  type: String
  category: String
  description: String
  displayName: String
  displaySymbol: String
  icon: String
}

type SparklinePoint {
  chainId: Int!
  address: String!
  label: String!
  component: String
  blockTime: BigInt!
  close: Float!
}

type Sparklines {
  tvl: [SparklinePoint]
  apy: [SparklinePoint]
}
`
