import express from 'express'
import { Pool } from 'pg'
import { ApolloServer, gql } from 'apollo-server-express'

const port = process.env.PORT || 3000

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: (process.env.POSTGRES_PORT || 5432) as number,
  database: process.env.POSTGRES_DATABASE || 'user',
  user: process.env.POSTGRES_USER || 'user',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 10,
  idleTimeoutMillis: 30_000,
})

const typeDefs = gql`
  type Latency {
    blockToQueue: Int!
    queueToTable: Int!
    blockToTable: Int!
  }

  type LatestBlock {
    chainId: Int!
    blockNumber: Int!
    blockTimestamp: String!
    queueTimestamp: String!
    updatedAt: String!
    latency: Latency!
  }

  type Vault {
    chainId: Int!
    address: String!
    version: String!
    symbol: String
    name: String
    decimals: Int
    totalAssets: String
    assetAddress: String
    assetSymbol: String
    assetName: String
    asOfBlockNumber: String
  }

  type Query {
    bananas: String,
    latestBlock(chainId: Int!): LatestBlock,
    vaults(chainId: Int): [Vault]
  }
`

const resolvers = {
  Query: {
    bananas: () => '🍌'.repeat(1 + Math.floor(Math.random() * 32)),

    vaults: async (_: any, args: { chainId?: number }) => {
      const { chainId } = args
      const query = `
        SELECT 
          chain_id as "chainId",
          address, 
          version, 
          symbol, 
          name, 
          decimals, 
          total_assets as "totalAssets", 
          asset_address as "assetAddress", 
          asset_name as "assetName", 
          asset_symbol as "assetSymbol", 
          as_of_block_number as "asOfBlockNumber" 
        FROM public.vault 
        WHERE chain_id = $1 OR $1 IS NULL
      `
      const values = [chainId]

      try {
        const res = await pool.query(query, values)
        return res.rows
      } catch (err) {
        console.error(err)
        throw new Error('Failed to fetch vaults')
      }
    },

    latestBlock: async (_: any, args: { chainId: number }) => {
      const { chainId } = args
      const query = `SELECT 
        chain_id as "chainId", 
        block_number as "blockNumber", 
        EXTRACT(EPOCH FROM block_timestamp) * 1000 as "blockTimestamp", 
        EXTRACT(EPOCH FROM queue_timestamp) * 1000 as "queueTimestamp",
        EXTRACT(EPOCH FROM updated_at) * 1000 as "updatedAt" 
        FROM public.latest_block 
        WHERE chain_id = $1
      `
      const values = [chainId]

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

const server = new ApolloServer({ 
  typeDefs, 
  resolvers,
  introspection: true,
  cache: 'bounded'
})

server.start().then(() => {
  const app = express()
  server.applyMiddleware({ app })
  app.listen(port, () => {
    console.log(`🐒 gql up (${port})`)
  })
})

function down() {
  pool.end().then(() => {
    console.log('🐒 gql down')
    process.exit(0)
  })
}

process.on('SIGINT', down)
process.on('SIGTERM', down)
