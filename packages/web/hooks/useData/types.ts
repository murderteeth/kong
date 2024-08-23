import { z } from 'zod'

const LatestBlockSchema = z.object({
  chainId: z.number(),
  blockNumber: z.bigint({ coerce: true }),
})

export const SparklinePointSchema = z.object({
  close: z.number(),
  blockTime: z.bigint({ coerce: true })
})

export const VaultSchema = z.object({
  chainId: z.number(),
  address: z.string(),
  name: z.string(),
  apiVersion: z.string(),
  sparklines: z.object({
    tvl: z.array(SparklinePointSchema).default([]),
    apy: z.array(SparklinePointSchema).default([])
  })
})

const TransferSchema = z.object({
  chainId: z.number(),
  address: z.string(),
  sender: z.string(),
  receiver: z.string(),
  valueUsd: z.number().nullish(),
  blockTime: z.bigint({ coerce: true }),
  transactionHash: z.string()
})

export type Transfer = z.infer<typeof TransferSchema>

const HarvestSchema = z.object({
  chainId: z.number(),
  address: z.string(),
  lossUsd: z.number().nullish(),
  profitUsd: z.number().nullish(),
  apr: z.object({
    gross: z.number(),
    net: z.number()
  }).nullish(),
  blockTime: z.string(),
  transactionHash: z.string()
})

export type Harvest = z.infer<typeof HarvestSchema>

const QueueSchema = z.object({
  name: z.string(),
  waiting: z.number(),
  active: z.number(),
  failed: z.number()
})

const DbSchema = z.object({
  databaseSize: z.number({ coerce: true }),
  indexHitRate: z.number({ coerce: true }),
  cacheHitRate: z.number({ coerce: true }),
  clients: z.number({ coerce: true })
})

const MemorySchema = z.object({
  total: z.number({ coerce: true }),
  used: z.number({ coerce: true })
})

const RedisSchema = z.object({
  uptime: z.number({ coerce: true }),
  clients: z.number({ coerce: true }),
  memory: MemorySchema
})

const CpuSchema = z.object({
  usage: z.number({ coerce: true })
})

const IngestSchema = z.object({
  cpu: CpuSchema,
  memory: MemorySchema
})

const NetworksSchema = z.object({
  chainId: z.number(),
  count: z.number()
})

const ApetaxSchema = z.object({
  stealth: z.number(),
  new: z.number(),
  active: z.number(),
  withdraw: z.number()
})

export const StatsSchema = z.object({
  total: z.number({ coerce: true }),
  endorsed: z.number({ coerce: true }),
  experimental: z.number({ coerce: true }),
  networks: z.array(NetworksSchema).default([]),
  apetax: ApetaxSchema
})

const MonitorSchema = z.object({
  queues: z.array(QueueSchema).default([]),
  db: DbSchema,
  redis: RedisSchema,
  ingest: IngestSchema,
  stats: StatsSchema
})

type Monitor = z.infer<typeof MonitorSchema>

export const OutputSchema = z.object({
  chainId: z.number(),
  address: z.string(),
  label: z.string(),
  component: z.string().nullish(),
  value: z.number(),
  period: z.string(),
  time: z.bigint({ coerce: true })
})

export const DataContextSchema = z.object({
  latestBlocks: z.array(LatestBlockSchema),
  monitor: MonitorSchema
})

export type DataContext = z.infer<typeof DataContextSchema>

export const DEFAULT_CONTEXT = {
  latestBlocks: [],
  monitor: {
    queues: [],
    db: {
      databaseSize: 0,
      indexHitRate: 0,
      cacheHitRate: 0,
      clients: 0
    },
    redis: {
      uptime: 0,
      clients: 0,
      memory: {
        total: 0,
        used: 0
      }
    },
    ingest: {
      cpu: {
        usage: 0
      },
      memory: {
        total: 0,
        used: 0
      }
    },
    stats: {
      total: 0,
      endorsed: 0,
      experimental: 0,
      networks: [],
      apetax: {
        stealth: 0,
        new: 0,
        active: 0,
        withdraw: 0
      }
    }
  } as Monitor
} as DataContext
