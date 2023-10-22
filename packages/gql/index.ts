require('lib/json.monketpatch')
import path from 'path'
import dotenv from 'dotenv'
import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import { Monitor } from './monitor'
import typeDefs from './typeDefs'
import db from './db'
import resolvers from './resolvers'
import { cache } from 'lib'
import { ProcessorPool } from 'lib/processor'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

const port = process.env.GQL_PORT || 3001

const server = new ApolloServer({ 
  typeDefs,
  resolvers,
  introspection: true,
  cache: 'bounded'
})

export const monitors = new ProcessorPool(Monitor, 1, 5_000)

Promise.all([
  cache.up(),
  server.start(),
  monitors.up()
]).then(() => {

  const app = express()
  server.applyMiddleware({ app })
  app.listen(port, () => {
    console.log(`🐒 gql up (${port})`)
  })  

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
