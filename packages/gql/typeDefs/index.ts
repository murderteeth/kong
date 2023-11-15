import { gql } from 'apollo-server-express'
import latestBlock from './latestBlock'
import strategy from './strategy'
import vault from './vault'
import monitorResults from './monitorResults'
import sparklineItem from './sparklineItem'
import tvl from './tvl'
import transfer from './transfer'
import harvest from './harvest'
import apy from './apy'
import period from './period'
import stats from './stats'

const query = gql`
  scalar BigInt

  type Query {
    bananas: String,
    latestBlocks(chainId: Int): [LatestBlock],
    vaults(chainId: Int): [Vault],
    vault(chainId: Int!, address: String!): Vault,
    tvls(chainId: Int!, address: String!, period: Period, limit: Int): [Tvl],
    apys(chainId: Int!, address: String!, period: Period, limit: Int): [Apy],
    harvests(chainId: Int, address: String): [Harvest],
    transfers(chainId: Int, address: String): [Transfer],
    monitor: MonitorResults,
    stats: Stats,
  }
`

export default [
  query,
  latestBlock, 
  sparklineItem,
  period,
  tvl,
  apy,
  strategy, 
  vault, 
  monitorResults,
  harvest,
  transfer,
  stats
]
