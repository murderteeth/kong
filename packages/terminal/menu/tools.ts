import path from 'path'
import * as fs from 'fs'
import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'
import { createClient } from 'redis'
import { Pool } from 'pg'
import { rpcs } from 'lib/rpcs'
import { parseAbi } from 'viem'

export default {
  action,
  menu: { title: 'Tools', value: 'tools' }
} as MenuAction

async function action() {
  const { tool, confirm } = await prompts([
    {
      type: 'select',
      name: 'tool',
      message: '',
      choices: [
        { title: 'extract a single vault', value: 'extract-vault' },
        { title: 'extract apetax vaults', value: 'extract-apetax-vaults' },
        { title: 'flush failed jobs', value: 'flush-failed-jobs' },
        { title: 'flush redis', value: 'flush-redis' },
        { title: 'reset database', value: 'reset-database' }
      ]
    },
    {
      type: prev => prev === 'extract-vault' ? null : 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 extract ${all.tool}?`,
    }
  ])

  if (confirm || tool === 'extract-vault') {
    switch(tool) {
      case 'extract-vault': {
        const { address } = await prompts([
          {
            type: 'text',
            name: 'address',
            message: 'vault',
            initial: '0xa258C4606Ca8206D8aA700cE2143D7db854D168c',
            validate: (value) => value.startsWith('0x') ? true : 'must start with 0x'
          }
        ])

        await rpcs.up()
        const multicall = await rpcs.next(1).multicall({ contracts: [
          {
            address, functionName: 'apiVersion',
            abi: parseAbi(['function apiVersion() returns (string)'])
          },
          {
            address, functionName: 'token',
            abi: parseAbi(['function token() returns (address)'])
          }
        ] })
        await rpcs.down()

        const queue = mq.queue(mq.q.extract)
        await queue.add(mq.job.extract.vault, {
          chainId: 1,
          type: 'vault',
          registryStatus: 'endorsed',
          address,
          apiVersion: multicall[0].result,
          assetAddress: multicall[1].result
        })
        await queue.close()
        break
      }

      case 'extract-apetax-vaults': {
        const queue = mq.queue(mq.q.extract)
        await queue.add(mq.job.extract.apetax, {})
        await queue.close()
        break
      }

      case 'flush-failed-jobs': {
        for(const key of Object.keys(mq.q)) {
          const queue = mq.queue(key)
          await queue.clean(0, Number.MAX_SAFE_INTEGER, 'failed')
          await queue.close()
        }
        break
      }

      case 'flush-redis': {
        const client = createClient({
          url: `redis://${process.env.REDIS_HOST || 'localhost'}:${(process.env.REDIS_PORT || 6379) as number}`
        })
        await client.connect()
        await client.flushAll()
        await client.quit()
        break
      }

      case 'reset-database': {
        const db = new Pool({
          host: process.env.POSTGRES_HOST || 'localhost',
          port: (process.env.POSTGRES_PORT || 5432) as number,
          ssl: (process.env.POSTGRES_SSL || false) as boolean,
          database: process.env.POSTGRES_DATABASE || 'user',
          user: process.env.POSTGRES_USER || 'user',
          password: process.env.POSTGRES_PASSWORD || 'password'
        })

        const dropsql = fs.readFileSync(path.join(__dirname, '../../../database', 'drop.sql'), 'utf8')
        const initsql = fs.readFileSync(path.join(__dirname, '../../../database', 'init.sql'), 'utf8')
        try {
          await db.query(dropsql)
        } catch(error) {
          console.warn(error)
        } finally {
          await db.query(initsql)
        }
        break
      }
    }
  }
}
