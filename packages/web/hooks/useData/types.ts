import { z } from 'zod'

const bigIntStringNSchema = z.string().transform((str) => {
  if (str.endsWith('n')) return BigInt(str.slice(0, -1))
  return BigInt(str)
})

const LatestBlockSchema = z.object({
  chainId: z.number(),
  blockNumber: z.bigint({ coerce: true }),
})

const TVLSparklineSchema = z.object({
  time: z.number(),
  value: z.number()
})

const QueueSchema_v2 = z.object({
  name: z.string(),
  address: z.string(),
  netApr: z.number()
})

const QueueSchema_v3 = z.object({
  name: z.string(),
  address: z.string(),
  apyNet: z.number()
})

const APYSparklineSchema = z.object({
  time: z.number(),
  value: z.number()
})

const VaultSchema = z.object({
  chainId: z.number(),
  address: z.string(),
  name: z.string(),
  apiVersion: z.string(),
  apetaxType: z.string().nullable().optional(),
  apetaxStatus: z.string().nullable().optional(),
  registryStatus: z.string(),
  tvlUsd: z.number().nullable().optional(),
  tvlSparkline: z.array(TVLSparklineSchema).default([]),
  apyNet: z.number().nullable().optional(),
  apySparkline: z.array(APYSparklineSchema).default([]),
  defaultQueue: z.array(QueueSchema_v3).default([]),
  withdrawalQueue: z.array(QueueSchema_v2).default([])
})

const TVLSchema = z.object({
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  period: z.string(),
  time: z.bigint().or(bigIntStringNSchema)
})

const APYSchema = z.object({
  average: z.number(),
  period: z.string(),
  time: z.bigint().or(bigIntStringNSchema)
})

const TransferSchema = z.object({
  chainId: z.number(),
  address: z.string(),
  sender: z.string(),
  receiver: z.string(),
  amountUsd: z.number(),
  blockTime: z.string(),
  transactionHash: z.string()
})

const HarvestSchema = z.object({
  chainId: z.number(),
  address: z.string(),
  lossUsd: z.number(),
  profitUsd: z.number(),
  blockTime: z.string(),
  transactionHash: z.string()
})

const QueueSchema = z.object({
  name: z.string(),
  waiting: z.number(),
  active: z.number(),
  failed: z.number()
})

const DbSchema = z.object({
  databaseSize: z.number(),
  indexHitRate: z.number(),
  cacheHitRate: z.number(),
  clients: z.number()
})

const MemorySchema = z.object({
  total: z.number(),
  used: z.number()
})

const RedisSchema = z.object({
  uptime: z.number(),
  clients: z.number(),
  memory: MemorySchema
})

const CpuSchema = z.object({
  usage: z.number()
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

const StatsSchema = z.object({
  total: z.number(),
  endorsed: z.number(),
  experimental: z.number(),
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

export const DataContextSchema = z.object({
  latestBlocks: z.array(LatestBlockSchema),
  vault: VaultSchema.nullable().optional(),
  tvls: z.array(TVLSchema).default([]),
  apys: z.array(APYSchema).default([]),
  transfers: z.array(TransferSchema).default([]),
  harvests: z.array(HarvestSchema).default([]),
  monitor: MonitorSchema
})

export type DataContext = z.infer<typeof DataContextSchema>

export const DEFAULT_CONTEXT = {
  latestBlocks: [],
  vault: null,
  tvls: [],
  apys: [],
  transfers: [],
  harvests: [],
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
