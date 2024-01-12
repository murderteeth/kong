import bananas from './bananas'
import latestBlocks from './latestBlocks'
import vaults from './vaults'
import vault from './vault'
import tvls from './tvls'
import apys from './apys'
import harvests from './harvests'
import transfers from './transfers'
import monitor from './monitor'
import riskGroups from './riskGroups'

const resolvers = {
  Query: {
    bananas,
    latestBlocks,
    vaults,
    vault,
    tvls,
    apys,
    harvests,
    transfers,
    monitor,
    riskGroups
  }
}

export default resolvers
