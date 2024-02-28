import gql from 'graphql-tag'
import vault from './vault'

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
  }
`

const typeDefs = [
  query,
  vault
]

export default typeDefs
