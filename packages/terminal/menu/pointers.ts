import { mq, chains } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Pointers', value: 'pointers' }
} as MenuAction

async function action() {
  const { chain, primitive, confirm } : {
    chain: any,
    primitive: 'registry' | 'vault',
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
      name: 'primitive',
      message: 'pick a contract primitive',
      choices: [
        { title: 'Registry', value: 'registry' },
        { title: 'Vault', value: 'vault' }
      ]
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 catchup yearn ${all.primitive} pointers on ${all.chain.name}?`,
    }
  ])
  
  if (confirm) {
    const queue = mq.queue(mq.q.yearn[primitive].pointer)
    const options = { chainId: chain.id }
    await queue.add(mq.q.yearn[primitive].pointerJobs.catchup, options)
    await queue.close()
  }
}
