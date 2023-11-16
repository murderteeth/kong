import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl'
import responseCachePlugin from '@apollo/server-plugin-response-cache'
import typeDefs from './typeDefs'
import resolvers from './resolvers'

const defaultCacheMaxAge = Number(process.env.GQL_DEFAULT_CACHE_MAX_AGE || 60 * 5)

const server = new ApolloServer({
  resolvers,
  typeDefs,
  introspection: true,
  plugins: [
    ApolloServerPluginCacheControl({ defaultMaxAge: defaultCacheMaxAge }),
    responseCachePlugin()
  ]
})

const handler = startServerAndCreateNextHandler(server)

export { handler as GET, handler as POST }
