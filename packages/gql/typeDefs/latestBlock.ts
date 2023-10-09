import { gql } from 'apollo-server-express'

export default gql`
type LatestBlock {
  chainId: Int!
  blockNumber: BigInt!
  blockTime: BigInt!
}
`
