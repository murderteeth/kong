import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'
import { createClient } from 'redis'
import db from '../../ingest/db'

export default {
  action,
  menu: { title: 'Tools', value: 'tools' }
} as MenuAction

async function action() {
  const { tool, confirm } = await prompts([
    {
      type: 'select',
      name: 'tool',
      message: '',
      choices: [
        { title: 'flush failed jobs', value: 'flush-failed-jobs' },
        { title: 'flush redis', value: 'flush-redis' },
        { title: 'reset database', value: 'reset-database' }
      ]
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 ${all.tool}?`,
    }
  ])

  if (confirm) {
    switch(tool) {
      case 'flush-failed-jobs': {
        for(const key of Object.keys(mq.q)) {
          const queue = mq.connect(key)
          await queue.clean(0, Number.MAX_SAFE_INTEGER, 'failed')
          await queue.close()
        }
        break
      }

      case 'flush-redis': {
        const client = createClient({
          url: `redis://${process.env.REDIS_HOST || 'localhost'}:${(process.env.REDIS_PORT || 6379) as number}`
        })
        await client.connect()
        await client.flushAll()
        await client.quit()
        break
      }

      case 'reset-database': {
        await db.query('TRUNCATE TABLE evmlog;')
        await db.query('TRUNCATE TABLE evmlog_strides;')
        await db.query('TRUNCATE TABLE thing;')
        await db.query('TRUNCATE TABLE snapshot;')
        await db.query('TRUNCATE TABLE output;')
        await db.query('TRUNCATE TABLE price;')
        break
      }
    }
  }
}
