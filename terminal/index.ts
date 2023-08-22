import dotenv from 'dotenv'
import prompts from 'prompts'
import { arbitrum, fantom, mainnet, optimism, polygon } from 'viem/chains'
import { mq } from 'lib'
import path from 'path'
import { contracts } from 'lib/contracts/yearn/registries'

const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })

async function main() {
  while(true) {

    const menu = (await prompts([
      {
        type: 'select',
        name: 'menu',
        message: '🦍 menu',
        choices: [
          { title: 'Index', value: 'index' },
          { title: 'Quit', value: 'quit' }
        ],
      }
    ])).menu

    switch(menu) {
      case 'index': {
        const {chain, registry, confirm} = await prompts([
          {
            type: 'select',
            name: 'chain',
            message: '⛓️  pick a chain',
            choices: [
              { title: mainnet.name, value: mainnet },
              { title: optimism.name, value: optimism },
              { title: polygon.name, value: polygon },
              { title: fantom.name, value: fantom },
              { title: arbitrum.name, value: arbitrum }
            ]
          },
          {
            type: 'select',
            name: 'registry',
            message: '📖 pick a registry',
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

        break
      }
      case 'quit': {
        process.exit(0)
      }
    }
  }
}

main().then(() => process.exit(0)).catch(error => {
  console.error('🤬', error)
  process.exit(1)
})
