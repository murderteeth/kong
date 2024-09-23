import bananas from './bananas'
import latestBlocks from './latestBlocks'
import monitor from './monitor'
import vaults from './vaults'
import vault from './vault'
import strategies from './strategies'
import transfers from './transfers'
import timeseries from './timeseries'
import { bigintScalar } from './bigintScalar'
import accountRoles from './accountRoles'
import accountVaults from './accountVaults'
import accountStrategies from './accountStrategies'
import vaultReports from './vaultReports'
import strategyReports from './strategyReports'
import strategy from './strategy'
import riskScores from './riskScores'
import vaultStrategies from './vaultStrategies'
import vaultAccounts from './vaultAccounts'
import prices from './prices'
import accountants from './accountants'
import accountant from './accountant'
import things from './things'
import tvls from './tvls'
import allocator from './allocator'

const resolvers = {
  BigInt: bigintScalar,
  Query: {
    bananas,
    latestBlocks,
    monitor,
    vaults,
    vault,
    vaultAccounts,
    vaultReports,
    vaultStrategies,
    prices,
    riskScores,
    strategies,
    strategy,
    strategyReports,
    transfers,
    timeseries,
    tvls,
    accountRoles,
    accountVaults,
    accountStrategies,
    accountants,
    accountant,
    allocator,
    things
  }
}

export default resolvers
