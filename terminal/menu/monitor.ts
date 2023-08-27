import { MenuAction } from '.'
import chalk from 'chalk'
import { Monitor } from '../../lib/monitor'

export default {
  action,
  menu: { title: 'Monitor', value: 'monitor' }
} as MenuAction


async function action() {
  const monitor = new Monitor()
  await monitor.up()

  const results = await monitor.latest()

  console.log(chalk.cyanBright(`[  message queues  ]`))
  results.queues.forEach(queue => {
    console.log(chalk.cyan(`[  ${queue.name}  ]`))
    console.log(`${queue.waiting} waiting, ${queue.active} active, ${queue.failed} failed`)
  })

  console.log(chalk.cyanBright(`[  redis  ]`))
  console.log(`uptime: ${results.redis.uptime}s, clients: ${results.redis.clients}`)
  console.log(`memory: ${results.redis.memory.used} / ${results.redis.memory.total}`)
  console.log(`peak: ${results.redis.memory.peak} / ${results.redis.memory.total}`)
  console.log(`frag: ${results.redis.memory.fragmentation}`)

  await monitor.down()
}
