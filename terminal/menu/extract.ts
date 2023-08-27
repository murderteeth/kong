import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Extract', value: 'extract' }
} as MenuAction

async function action() {
  const {confirm} = await prompts([
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 extract apetax vaults?`,
    }
  ])

  if (confirm) {
    const queue = mq.queue(mq.q.yearn.registry.extract)
    const options = {}
    await queue.add(mq.q.yearn.registry.extractJobs.apetax, options)
    await queue.close()
  }
}
