import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl'
import responseCachePlugin from '@apollo/server-plugin-response-cache'
import typeDefs from './typeDefs'
import resolvers from './resolvers'

const enableCache = process.env.GQL_ENABLE_CACHE === 'true'
const defaultCacheMaxAge = Number(process.env.GQL_DEFAULT_CACHE_MAX_AGE || 60 * 5)

const plugins = []
if(enableCache) {
  plugins.push(ApolloServerPluginCacheControl({ defaultMaxAge: defaultCacheMaxAge }))
  plugins.push(responseCachePlugin())
}

const server = new ApolloServer({
  resolvers,
  typeDefs,
  plugins,
  introspection: true
})

const handler = startServerAndCreateNextHandler(server)

export { handler as GET, handler as POST }
