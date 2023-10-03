import { mq, chains } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Vaults', value: 'vaults' }
} as MenuAction

async function action() {
  const { chain, job, confirm } : {
    chain: any,
    job: 'block' | 'tvl'
    confirm: any
  } = await prompts([
    {
      type: 'select',
      name: 'chain',
      message: 'pick a chain',
      choices: chains.map(chain => ({ title: chain.name, value: chain }))
    },
    {
      type: 'select',
      name: 'job',
      message: 'pick a job',
      choices: [
        { title: 'Block', value: 'block' },
        { title: 'Tvl', value: 'tvl' }
      ]
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 yearn vault ${all.job} pointers on ${all.chain.name}?`,
    }
  ])
  
  if (confirm) {
    const queue = mq.queue(mq.q.yearn.vault.pointer)
    const options = { chainId: chain.id }
    await queue.add(mq.q.yearn.vault.pointerJobs.catchup[job], options)
    await queue.close()
  }
}
