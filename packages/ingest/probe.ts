import os from 'os'
import { mq } from 'lib'
import { Queue, Worker } from 'bullmq'
import { Processor } from 'lib/processor'

export default class Probe implements Processor {
  worker: Worker | undefined
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.monitor)
    this.worker = mq.worker(mq.q.probe, async job => {
      const label = `👽 ${job.name} ${job.id}`
      console.time(label)

      const totalMemory = os.totalmem()
      const freeMemory = os.freemem()
      const usedMemory = totalMemory - freeMemory

      const cpus = os.cpus()
      let totalIdle = 0, totalTick = 0
      cpus.forEach(cpu => {
        totalTick += Object.values(cpu.times).reduce((a, b) => a + b, 0)
        totalIdle += cpu.times.idle
      })

      const idle = totalIdle / cpus.length
      const total = totalTick / cpus.length
      const usage = (total - idle) / total

      await this.queue?.add(mq.job.monitor.ingest, {
        cpu: { usage },
        memory: {
          total: totalMemory,
          used: usedMemory
        }
      })

      console.timeEnd(label)
    })
  }

  async down() {
    await this.queue?.close()
  }
}
