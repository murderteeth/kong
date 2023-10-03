import { mq, chains } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Poll', value: 'poll' }
} as MenuAction

async function action() {
  const { job, confirm } : {
    job: 'harvestApr'
    confirm: any
  } = await prompts([
    {
      type: 'select',
      name: 'job',
      message: 'pick a job',
      choices: [
        { title: 'Harvest APR', value: 'harvestApr' }
      ]
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 poll ${all.job}s?`,
    }
  ])

  if (confirm) {
    if(job === 'harvestApr') {
      const queue = mq.queue(mq.q.fanout)
      await queue.add(mq.job.fanout.harvestApr, {})
      await queue.close()
    }
  }
}
