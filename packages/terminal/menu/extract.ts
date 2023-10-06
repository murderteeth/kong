import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Extract', value: 'extract' }
} as MenuAction

async function action() {
  const { target, confirm } = await prompts([
    {
      type: 'select',
      name: 'target',
      message: 'pick a manual extract target',
      choices: [
        { title: 'yWETH vault', value: 'yweth' }, 
        { title: 'Apetax vaults', value: 'apetax' }
      ]
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 extract ${all.target}?`,
    }
  ])

  if (confirm) {
    switch(target) {
      case 'yweth': {
        const queue = mq.queue(mq.q.yearn.vault.extract)
        await queue.add(mq.q.yearn.vault.extractJobs.state, {
          chainId: 1,
          type: 'vault',
          registryStatus: 'endorsed',
          registryAddress: '0xe15461b18ee31b7379019dc523231c57d1cbc18c' as `0x${string}`,
          address: '0xa258C4606Ca8206D8aA700cE2143D7db854D168c',
          apiVersion: '0.4.2',
          assetAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
        })
        await queue.close()
        break
      }

      case 'apetax': {
        const queue = mq.queue(mq.q.extract)
        await queue.add(mq.job.extract.apetax, {})
        await queue.close()
        break
      }
    }
  }
}
