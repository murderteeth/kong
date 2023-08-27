import { Queue } from 'bullmq';
import { Processor } from './processor'
import { mq } from '.'
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

  async up() {
    this.queues = [
      mq.queue(mq.q.yearn.index),
      mq.queue(mq.q.yearn.registry.pointer),
      mq.queue(mq.q.yearn.registry.extract),
      mq.queue(mq.q.yearn.vault.pointer),
      mq.queue(mq.q.yearn.vault.extract),
      mq.queue(mq.q.yearn.vault.load),
      mq.queue(mq.q.yearn.strategy.pointer),
      mq.queue(mq.q.yearn.strategy.extract),
      mq.queue(mq.q.yearn.strategy.load),
    ]
  }

  async down() {
    await Promise.all(this.queues.map(q => q.close()))
  }

  async latest() {
    const result = {
      queues: [] as MonitorResults['queues'],
      redis: {} as MonitorResults['redis']
    } as MonitorResults

    for(const queue of this.queues) {
      result.queues.push({
        name: queue.name,
        waiting: (await queue.getJobs('waiting')).length,
        active: (await queue.getJobs('active')).length,
        failed: (await queue.getJobs('failed')).length
      })
    }

    const rawRedis = await (await this.queues[0].client).info()
    const redisInfo = parseRedisRaw(rawRedis)

    result.redis = {
      version: redisInfo.redis_version,
      mode: redisInfo.redis_mode,
      os: redisInfo.os,
      uptime: +redisInfo.uptime_in_seconds,
      clients: +redisInfo.connected_clients,
      memory: {
        total: +redisInfo.total_system_memory || +redisInfo.maxmemory,
        used: +redisInfo.used_memory,
        peak: +redisInfo.used_memory_peak,
        fragmentation: +redisInfo.mem_fragmentation_ratio
      }
    }

    return result
  }
}
