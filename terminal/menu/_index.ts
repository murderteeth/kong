import { chains, mq } from 'lib'
import { contracts } from 'lib/contracts/yearn/registries'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Index', value: 'index' }
} as MenuAction

async function action() {
  const {chain, registry, confirm} = await prompts([
    {
      type: 'select',
      name: 'chain',
      message: 'pick a chain',
      choices: chains.map(chain => ({ title: chain.name, value: chain }))
    },
    {
      type: 'select',
      name: 'registry',
      message: 'pick a registry',
      choices: (_, all) => {
        const registries = contracts.for(parseInt(all.chain.id))
        return Object.keys(registries).map(key => ({ title: key, value: key }))
      }
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 index ${all.registry} on ${all.chain.name}?`,
    }
  ])

  if (confirm) {
    const queue = mq.queue(mq.q.yearn.index)
    const options = { chainId: chain.id, key: registry }
    await queue.add(mq.q.yearn.indexJobs.registry, options)
    await queue.close()
  }
}