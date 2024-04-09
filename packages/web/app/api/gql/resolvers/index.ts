import bananas from './bananas'
import latestBlocks from './latestBlocks'
import monitor from './monitor'
import vaults from './vaults'
import vault from './vault'
import strategies from './strategies'
import transfers from './transfers'
import harvests from './harvests'
import timeseries from './timeseries'
import { bigintScalar } from './bigintScalar'
import accountRoles from './accountRoles'
import accountVaults from './accountVaults'
import accountStrategies from './accountStrategies'

const resolvers = {
  BigInt: bigintScalar,
  Query: {
    bananas,
    latestBlocks,
    monitor,
    vaults,
    vault,
    strategies,
    transfers,
    harvests,
    timeseries,
    accountRoles,
    accountVaults,
    accountStrategies
  }
}

export default resolvers
