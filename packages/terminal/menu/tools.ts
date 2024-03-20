import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'
import { createClient } from 'redis'

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
        { title: 'flush redis', value: 'flush-redis' }
      ]
    },
    {
      type: prev => prev === 'extract-vault' ? null : 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 extract ${all.tool}?`,
    }
  ])

  if (confirm || tool === 'extract-vault') {
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
    }
  }
}
