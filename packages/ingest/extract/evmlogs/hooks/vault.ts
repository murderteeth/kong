import { Queue } from 'bullmq'
import { mq } from 'lib'
import { Hook } from '..'
import { Log, toEventSelector } from 'viem'

export default class VaultHook implements Hook {
  key = 'vault'
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  async hook(chainId: number, address: `0x${string}`, log: Log) {
    const topic = log.topics[0]
    const newEndorsedVault = toEventSelector(`event NewEndorsedVault(address indexed vault, address indexed asset, uint256 releaseVersion, uint256 vaultType)`)
    if(topic === newEndorsedVault) {
      const { vault, asset, releaseVersion, vaultType } = (log as any)['args']
      console.log()
      console.log('---------------')
      console.log(chainId, address)
      console.log(vault, asset, releaseVersion, vaultType)
      console.log('---------------')
      console.log()
    }
  }
}
