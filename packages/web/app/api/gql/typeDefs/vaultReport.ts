import gql from 'graphql-tag'

export default gql`
type VaultReport {
  chainId: Int!
  address: String!
  eventName: String!
  strategy: String!
  gain: BigInt!
  loss: BigInt!
  debtPaid: BigInt
  totalGain: BigInt
  totalLoss: BigInt
  totalDebt: BigInt
  debtAdded: BigInt
  debtRatio: BigInt
  currentDebt: BigInt
  protocolFees: BigInt
  totalFees: BigInt
  totalRefunds: BigInt
  gainUsd: Float
  lossUsd: Float
  debtPaidUsd: Float
  totalGainUsd: Float
  totalLossUsd: Float
  totalDebtUsd: Float
  debtAddedUsd: Float
  currentDebtUsd: Float
  protocolFeesUsd: Float
  totalFeesUsd: Float
  totalRefundsUsd: Float
  priceUsd: Float,
  priceSource: String,
  blockNumber: Int!
  blockTime: BigInt!
  logIndex: Int!
  transactionHash: String!
}
`
