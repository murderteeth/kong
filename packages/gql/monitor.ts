import { Queue, Worker } from 'bullmq'
import { mq } from 'lib'
import { Processor } from 'lib/processor'
import { parse as parseRedisRaw } from 'redis-info'

export interface MonitorResults {
  queues: {
    name: string
    waiting: number
    active: number
    failed: number
  }[]
  redis: {
    version: string
    mode: string
    os: string
    uptime: number
    clients: number
    memory: {
      total: number
      used: number
      peak: number
      fragmentation: number
    }
  }
  ingest: {
    cpu: {
      usage: number
    }
    memory: {
      total: number
      used: number
    }
  }
}

const DEFAULT = {
  queues: [],
  db: {
    databaseSize: 0,
    indexHitRate: 0,
    cacheHitRate: 0,
    clients: 0
  },
  redis: {
    version: '',
    mode: '',
    os: '',
    uptime: 0,
    clients: 0,
    memory: {
      total: 0,
      used: 0,
      peak: 0,
      fragmentation: 0
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
  }
} as MonitorResults

export class Monitor implements Processor {
  private worker: Worker | undefined
  private queues: Queue[] = []
  private redisClient: any | undefined
  private timer: NodeJS.Timeout | undefined
  private _latestIngestMonitor: MonitorResults['ingest'] = DEFAULT.ingest
  private _latest: MonitorResults = DEFAULT

  async up() {
    this.queues = [
      mq.queue(mq.q.fanout),
      mq.queue(mq.q.extract),
      mq.queue(mq.q.compute),
      mq.queue(mq.q.load)
    ]

    this.redisClient = await this.queues[0].client

    this._latest = await this.getLatest()
    this.timer = setInterval(async () => {
      this._latest = await this.getLatest()
    }, 2000)

    this.worker = mq.worker(mq.q.monitor, async job => {
      if(job.name === mq.job.monitor.ingest) {
        this._latestIngestMonitor = job.data as MonitorResults['ingest'] || DEFAULT.ingest
      }
    })
  }

  async down() {
    clearInterval(this.timer)
    await this.worker?.close()
    await Promise.all(this.queues.map(q => q.close()))
    this.redisClient = undefined
  }

  get latest() {
    return this._latest
  }

  async failed(queueName: string) {
    return (await this.queues.find(q => q.name === queueName)?.getJobs('failed')) || []
  }

  private async getLatest() {
    const result = {
      queues: [] as MonitorResults['queues'],
      redis: {} as MonitorResults['redis'],
      ingest: this._latestIngestMonitor
    } as MonitorResults

    for(const queue of this.queues) {
      result.queues.push({
        name: queue.name,
        waiting: await queue.count(),
        active: (await queue.getJobs('active')).length,
        failed: (await queue.getJobs('failed')).length
      })
    }

    const rawRedis = await this.redisClient.info()
    const redisInfo = parseRedisRaw(rawRedis)

    result.redis = {
      version: redisInfo.redis_version,
      mode: redisInfo.redis_mode,
      os: redisInfo.os,
      uptime: +redisInfo.uptime_in_seconds,
      clients: +redisInfo.connected_clients,
      memory: {
        total: +redisInfo.maxmemory,
        used: +redisInfo.used_memory,
        peak: +redisInfo.used_memory_peak,
        fragmentation: +redisInfo.mem_fragmentation_ratio
      }
    }

    return result
  }
}
