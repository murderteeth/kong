import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'
import { createClient } from 'redis'
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
        { title: 'flush redis', value: 'flush-redis' }
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
        const { chainId, address } = await prompts([
          {
            type: 'number',
            name: 'chainId',
            message: 'chainId',
            initial: '1',
            validate: (value) => `\d+`.match(value) ? true : 'must be integer'
          },
          {
            type: 'text',
            name: 'address',
            message: 'vault',
            initial: '0x27B5739e22ad9033bcBf192059122d163b60349D',
            validate: (value) => value.startsWith('0x') ? true : 'must start with 0x'
          }
        ])

        await rpcs.up()
        const multicall = await rpcs.next(chainId).multicall({ contracts: [
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
        await mq.add(mq.job.extract.vault, {
          chainId: chainId,
          type: 'vault',
          registryStatus: 'endorsed',
          address,
          apiVersion: multicall[0].result,
          assetAddress: multicall[1].result
        })
        break
      }

      case 'extract-apetax-vaults': {
        await mq.add(mq.job.extract.apetax, {})
        break
      }

      case 'flush-failed-jobs': {
        for(const key of Object.keys(mq.q)) {
          const queue = mq.connect(key)
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
    }
  }
}
