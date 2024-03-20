import gql from 'graphql-tag'
import lib from './lib'
import vault from './vault'
import output from './output'
import strategy from './strategy'
import harvest from './harvest'
import transfer from './transfer'
import latestBlock from './latestBlock'
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
    vault(chainId: Int, address: String): Vault
    strategies(chainId: Int): [Strategy]
    transfers(chainId: Int, address: String): [Transfer]
    harvests(chainId: Int, address: String, limit: Int): [Harvest]
    timeseries(chainId: Int!, address: String!, label: String!, component: String, period: String): [Output]
  }
`

const typeDefs = [
  query,
  lib,
  vault,
  strategy,
  transfer,
  harvest,
  output,
  latestBlock,
  monitor
]

export default typeDefs
