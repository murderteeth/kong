import gql from 'graphql-tag'
import lib from './lib'
import vault from './vault'
import output from './output'
import strategy from './strategy'
import transfer from './transfer'
import latestBlock from './latestBlock'
import monitor from './monitor'
import accountRole from './accountRole'
import vaultReport from './vaultReport'
import strategyReport from './strategyReport'

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
    vaultReports(chainId: Int, address: String): [VaultReport]
    strategies(chainId: Int): [Strategy]
    strategy(chainId: Int, address: String): Strategy
    strategyReports(chainId: Int, address: String): [StrategyReport]
    transfers(chainId: Int, address: String): [Transfer]
    timeseries(chainId: Int!, address: String!, label: String!, component: String, period: String): [Output]
    accountRoles(chainId: Int, account: String!): [AccountRole]
    accountVaults(chainId: Int, account: String!): [Vault]
    accountStrategies(chainId: Int, account: String!): [Strategy]
  }
`

const typeDefs = [
  query,
  lib,
  vault,
  vaultReport,
  strategy,
  strategyReport,
  transfer,
  output,
  latestBlock,
  monitor,
  accountRole
]

export default typeDefs
