import { Queue } from 'bullmq'
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
}

export class Monitor implements Processor {
  private queues: Queue[] = []
  private redisClient: any | undefined
  private timer: NodeJS.Timeout | undefined
  private _latest: MonitorResults | undefined

  async up() {
    this.queues = [
      mq.queue(mq.q.poll),
      mq.queue(mq.q.fanout),
      mq.queue(mq.q.extract),
      mq.queue(mq.q.compute),
      mq.queue(mq.q.load),
      mq.queue(mq.q.transfer.extract),
      mq.queue(mq.q.yearn.strategy.pointer),
      mq.queue(mq.q.yearn.strategy.extract),
      mq.queue(mq.q.yearn.strategy.load),
    ]

    this.redisClient = await this.queues[0].client

    this.timer = setInterval(async () => {
      this._latest = await this.getLatest()
    }, 1000)
  }

  async down() {
    clearInterval(this.timer)
    this.redisClient = undefined
    await Promise.all(this.queues.map(q => q.close()))
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
      redis: {} as MonitorResults['redis']
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

const monitor = new Monitor()

export default monitor
