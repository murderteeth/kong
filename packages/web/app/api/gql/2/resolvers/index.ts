import vaults from './vaults'
import timeseries from './timeseries'
import { bigintScalar } from './bigintScalar'

const resolvers = {
  BigInt: bigintScalar,
  Query: {
    vaults,
    timeseries
  }
}

export default resolvers
