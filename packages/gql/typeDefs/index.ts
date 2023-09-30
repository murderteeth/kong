import { gql } from 'apollo-server-express'
import latestBlock from './latestBlock'
import strategy from './strategy'
import vault from './vault'
import monitorResults from './monitorResults'
import sparklineItem from './sparklineItem'
import tvl from './tvl'

const query = gql`
  scalar BigInt

  type Query {
    bananas: String,
    latestBlocks(chainId: Int): [LatestBlock],
    vaults(chainId: Int): [Vault],
    vault(chainId: Int!, address: String!): Vault,
    monitor: MonitorResults
  }
`

export default [
  query, 
  latestBlock, 
  sparklineItem,
  tvl,
  strategy, 
  vault, 
  monitorResults
]
