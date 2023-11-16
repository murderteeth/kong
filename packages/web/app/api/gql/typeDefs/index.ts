import gql from 'graphql-tag'
import latestBlock from './latestBlock'
import strategy from './strategy'
import vault from './vault'
import sparklineItem from './sparklineItem'
import tvl from './tvl'
import transfer from './transfer'
import harvest from './harvest'
import apy from './apy'
import period from './period'
import monitor from './monitor'

const query = gql`
  scalar BigInt

  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  directive @cacheControl(
    maxAge: Int
    scope: CacheControlScope
    inheritMaxAge: Boolean
  ) on FIELD_DEFINITION | OBJECT | INTERFACE | UNION

  type Query {
    bananas: String @cacheControl(maxAge: 0)
    latestBlocks(chainId: Int): [LatestBlock] @cacheControl(maxAge: 2)
    monitor: Monitor @cacheControl(maxAge: 2)

    vaults(chainId: Int): [Vault]
    vault(chainId: Int!, address: String!): Vault
    tvls(chainId: Int!, address: String!, period: Period, limit: Int): [Tvl]
    apys(chainId: Int!, address: String!, period: Period, limit: Int): [Apy]
    harvests(chainId: Int, address: String): [Harvest]
    transfers(chainId: Int, address: String): [Transfer]
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
  harvest,
  transfer,
  monitor
]
