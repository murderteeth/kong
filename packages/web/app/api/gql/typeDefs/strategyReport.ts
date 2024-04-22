import gql from 'graphql-tag'

export default gql`
type StrategyReport {
  chainId: Int!
  address: String!
  eventName: String!
  profit: BigInt!
  loss: BigInt!
  debtPayment: BigInt
  debtOutstanding: BigInt
  protocolFees: BigInt
  performanceFees: BigInt
  apr: ReportApr
  profitUsd: Float
  lossUsd: Float
  debtPaymentUsd: Float
  debtOutstandingUsd: Float
  protocolFeesUsd: Float
  performanceFeesUsd: Float
  priceUsd: Float,
  priceSource: String,
  blockNumber: Int!
  blockTime: BigInt!
  logIndex: Int!
  transactionHash: String!
}
`
