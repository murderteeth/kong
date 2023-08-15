import express from 'express'
import { Pool } from 'pg'
import { ApolloServer, gql } from 'apollo-server-express'

const port = process.env.PORT || 3000

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: (process.env.POSTGRES_PORT || 5432) as number,
  database: 'user',
  user: process.env.POSTGRES_USER || 'user',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 20,
  idleTimeoutMillis: 30_000,
})



const typeDefs = gql`
  type Latency {
    blockToQueue: Int!
    queueToTable: Int!
    blockToTable: Int!
  }

  type LatestBlock {
    networkId: Int!
    blockNumber: Int!
    blockTimestamp: String!
    queueTimestamp: String!
    updatedAt: String!
    latency: Latency!
  }

  type Query {
    ahoy: String,
    latestBlock(networkId: Int!): LatestBlock
  }
`

const resolvers = {
  Query: {
    ahoy: () => 'Ahoy!',
    latestBlock: async (_: any, args: { networkId: number }) => {
      const { networkId } = args
      const query = `SELECT 
        network_id as "networkId", 
        block_number as "blockNumber", 
        EXTRACT(EPOCH FROM block_timestamp) * 1000 as "blockTimestamp", 
        EXTRACT(EPOCH FROM queue_timestamp) * 1000 as "queueTimestamp",
        EXTRACT(EPOCH FROM updated_at) * 1000 as "updatedAt" 
        FROM public.latest_block 
        WHERE network_id = $1
      `
      const values = [networkId]

      try {
        const res = await pool.query(query, values)
        const row = res.rows[0]

        const latency = {
          blockToQueue: Math.round(parseFloat(row.queueTimestamp) - parseFloat(row.blockTimestamp)),
          queueToTable: Math.round(parseFloat(row.updatedAt) - parseFloat(row.queueTimestamp)),
          blockToTable: Math.round(parseFloat(row.updatedAt) - parseFloat(row.blockTimestamp)),
        }

        return {...row, latency}
      } catch (err) {
        console.error(err)
        throw new Error('Failed to fetch latest block')
      }
    }
  },
}

const server = new ApolloServer({ typeDefs, resolvers })
server.start().then(() => {
  const app = express()
  server.applyMiddleware({ app })
  app.listen(port, () => {
    console.log(`🦍 gql api listening on ${port}`)
  })
})

function shutdown() {
  pool.end().then(() => {
    console.log('🦍 gql api down')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
