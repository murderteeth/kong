import { gql } from 'apollo-server-express'
import latestBlock from './latestBlock'
import strategy from './strategy'
import vault from './vault'
import monitorResults from './monitorResults'
import sparklineItem from './sparklineItem'
import tvl from './tvl'
import transfer from './transfer'
import harvest from './harvest'
import fail from './fail'

const query = gql`
  scalar BigInt

  type Query {
    bananas: String,
    latestBlocks(chainId: Int): [LatestBlock],
    vaults(chainId: Int): [Vault],
    vault(chainId: Int!, address: String!): Vault,
    tvls(chainId: Int!, address: String!): [Tvl],
    harvests(chainId: Int, address: String): [Harvest],
    transfers(chainId: Int, address: String): [Transfer],
    monitor: MonitorResults,
    fail(queueName: String!): [Fail]
  }
`

export default [
  query, 
  latestBlock, 
  sparklineItem,
  tvl,
  strategy, 
  vault, 
  monitorResults,
  harvest,
  transfer,
  fail
]
