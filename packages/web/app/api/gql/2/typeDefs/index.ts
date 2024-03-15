import gql from 'graphql-tag'
import vault from './vault'
import output from './output'

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
    vaults(chainId: Int): [Vault]
    timeseries(chainId: Int!, address: String!, label: String!, component: String): [Output]
  }
`

const typeDefs = [
  query,
  vault,
  output
]

export default typeDefs
