import gql from 'graphql-tag'

export default gql`
type Accountant {
  chainId: Int!
  address: String!
  feeManager: String!
  feeRecipient: String!
  futureFeeManager: String
  managementFeeThreshold: BigInt
  performanceFeeThreshold: BigInt
  maxLoss: BigInt
  vaultManager: String
  vaults: [String]
}
`
