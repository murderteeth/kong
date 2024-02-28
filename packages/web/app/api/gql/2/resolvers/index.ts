import vaults from './vaults'
import { bigintScalar } from './bigintScalar'

const resolvers = {
  BigInt: bigintScalar,
  Query: {
    vaults
  }
}

export default resolvers
