import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Fanout', value: 'fanout' }
} as MenuAction

async function action() {
  const { job, confirm } = await prompts([
    {
      type: 'select',
      name: 'job',
      message: 'pick a fanout job',
      choices: [
        { title: 'index vault registries', value: 'registry' }
      ]
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 fanout ${all.job} jobs?`,
    }
  ])

  if (confirm) {
    switch(job) {
      case 'registry': {
        const queue = mq.queue(mq.q.fanout)
        await queue.add(mq.job.fanout.registry, {})
        await queue.close()
        break
      }
    }
  }
}
