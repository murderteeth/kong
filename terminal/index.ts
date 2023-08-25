import dotenv from 'dotenv'
import prompts from 'prompts'
import { arbitrum, fantom, mainnet, optimism, polygon } from 'viem/chains'
import { createClient } from 'redis'
import { mq } from 'lib'
import path from 'path'
import figlet from 'figlet'
import chalk from 'chalk'
import { contracts } from 'lib/contracts/yearn/registries'

const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })

const redis = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${(process.env.REDIS_PORT || 6379) as number}`
})

async function main() {
  console.log()
  console.log(chalk.yellow(figlet.textSync('KONG', { font: 'Chiseled', horizontalLayout: 'fitted' })))
  console.log()

  while(true) {
    const menu = (await prompts([
      {
        type: 'select',
        name: 'menu',
        message: '🐒 menu',
        choices: [
          { title: 'Block pointers', value: 'pointers' },
          { title: 'Index', value: 'index' },
          { title: 'Extract', value: 'extract' },
          { title: 'Redis', value: 'redis' },
          { title: 'Message queue', value: 'queue' },
          { title: 'Quit', value: 'quit' }
        ],
      }
    ])).menu

    switch(menu) {
      case 'pointers': {
        const { chain, primitive, confirm } : {
          chain: any,
          primitive: 'registry' | 'vault',
          confirm: any
        } = await prompts([
          {
            type: 'select',
            name: 'chain',
            message: 'pick a chain',
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

        break;
      }

      case 'index': {
        const {chain, registry, confirm} = await prompts([
          {
            type: 'select',
            name: 'chain',
            message: 'pick a chain',
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

        break
      }

      case 'extract': {
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

        break
      }

      case 'redis': {
        await redis.connect()
        console.log('await redis.memoryStats()', await redis.memoryStats())
        await redis.disconnect()
        break
      }

      case 'queue': {
        console.log(chalk.yellow('🍌 coming soon 🍌'))
        break;
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
