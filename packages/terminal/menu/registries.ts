import { mq, chains } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Registries', value: 'registries' }
} as MenuAction

async function action() {
  const { chain, confirm } : {
    chain: any,
    confirm: any
  } = await prompts([
    {
      type: 'select',
      name: 'chain',
      message: 'pick a chain',
      choices: chains.map(chain => ({ title: chain.name, value: chain }))
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 catchup yearn registry pointers on ${all.chain.name}?`,
    }
  ])

  if (confirm) {
    const queue = mq.queue(mq.q.yearn.registry.pointer)
    const options = { chainId: chain.id }
    await queue.add(mq.q.yearn.registry.pointerJobs.catchup.block, options)
    await queue.close()
  }
}
