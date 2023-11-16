import gql from 'graphql-tag'

export default gql`
type LatestBlock {
  chainId: Int!
  blockNumber: BigInt!
  blockTime: BigInt!
}
`
