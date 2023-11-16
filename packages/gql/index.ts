require('lib/json.monkeypatch')
import path from 'path'
import dotenv from 'dotenv'
import { Monitor } from './monitor'
import typeDefs from './typeDefs'
import db from './db'
import resolvers from './resolvers'
import { cache } from 'lib'
import { ProcessorPool } from 'lib/processor'
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl'
import responseCachePlugin from '@apollo/server-plugin-response-cache'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

const port = Number(process.env.GQL_PORT || 3001)

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [
    ApolloServerPluginCacheControl({ defaultMaxAge: 60 }),
    responseCachePlugin()
  ]
})

export const monitors = new ProcessorPool(Monitor, 1, 600_000)

Promise.all([
  cache.up(),
  startStandaloneServer(server, { listen: { port } }),
  monitors.up()
]).then(() => {

  console.log(`🐒 gql up (${port})`)

}).catch(error => {
  console.error(error)
  process.exit(1)
})

function down() {
  Promise.all([
    cache.down(),
    monitors.down(),
    db.end()
  ]).then(() => {
    console.log('🐒 gql down')
    process.exit(0)
  })
}

process.on('SIGINT', down)
process.on('SIGTERM', down)
