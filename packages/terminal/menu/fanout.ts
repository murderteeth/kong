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
        { title: 'index registry events', value: mq.job.fanout.registry },
        { title: 'index vault events', value: mq.job.fanout.vault },
        { title: 'compute tvls', value: mq.job.fanout.tvl },
        { title: 'compute harvest aprs', value: mq.job.fanout.harvestApr },
      ]
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 fanout ${all.job} jobs?`,
    }
  ])

  if (confirm) {
    const queue = mq.queue(mq.q.fanout)
    await queue.add(job, {})
    await queue.close()
  }
}
