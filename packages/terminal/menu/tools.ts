import path from 'path'
import * as fs from 'fs'
import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'
import { createClient } from 'redis'
import { Pool } from 'pg'

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
      message: (_, all) => `🤔 extract ${all.tool}?`,
    }
  ])

  if (confirm) {
    switch(tool) {
      case 'flush-failed-jobs': {
        for(const key of Object.keys(mq.q)) {
          const queue = mq.queue(key)
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
        // await client.clientKill({ type: 'normal' } as any)
        await client.quit()
        break
      }

      case 'reset-database': {
        const db = new Pool({
          host: process.env.POSTGRES_HOST || 'localhost',
          port: (process.env.POSTGRES_PORT || 5432) as number,
          database: process.env.POSTGRES_DATABASE || 'user',
          user: process.env.POSTGRES_USER || 'user',
          password: process.env.POSTGRES_PASSWORD || 'password'
        })

        const dropsql = fs.readFileSync(path.join(__dirname, '../../../database', 'drop.sql'), 'utf8')
        const initsql = fs.readFileSync(path.join(__dirname, '../../../database', 'init.sql'), 'utf8')
        try {
          await db.query(dropsql)
        } catch(error) {
          console.warn(error)
        } finally {
          await db.query(initsql)
        }
        break
      }
    }
  }
}
