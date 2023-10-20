import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

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
        { title: 'trash failed jobs', value: 'trash-failed-jobs' }
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
      case 'trash-failed-jobs': {
        for(const key of Object.keys(mq.q)) {
          const queue = mq.queue(key)
          const result = await queue.clean(0, Number.MAX_SAFE_INTEGER, 'failed')
          await queue.close()
        }
        break
      }
    }
  }
}
