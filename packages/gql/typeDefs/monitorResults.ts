import { gql } from 'apollo-server-express'

export default gql`
type MonitorResults {
  queues: [QueueStatus]
  redis: RedisInfo!
  db: DbInfo!
  ingest: IngestInfo!
}

type QueueStatus {
  name: String!
  waiting: Int!
  active: Int!
  failed: Int!    
}

type RedisMemory {
  total: BigInt!
  used: BigInt!
  peak: BigInt!
  fragmentation: Float!
}

type RedisInfo {
  version: String!
  mode: String!
  os: String!
  uptime: Int!
  clients: Int!
  memory: RedisMemory!
}

type DbInfo {
  clients: Int!
  databaseSize: BigInt!
  indexHitRate: Float!
  cacheHitRate: Float!
}

type IngestCpu {
  usage: Float!
}

type IngestMemory {
  total: BigInt!
  used: BigInt!
}

type IngestInfo {
  cpu: IngestCpu!
  memory: IngestMemory!
}
`
