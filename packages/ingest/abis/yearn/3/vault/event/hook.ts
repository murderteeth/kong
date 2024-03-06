import { z } from 'zod'
import { toEventSelector } from 'viem'
import { zhexstring } from 'lib/types'
import { mq } from 'lib'

const changeType = {
  [2 ** 0]: 'add',
  [2 ** 1]: 'revoke'
}

export const topics = [
  `event StrategyChanged(address indexed strategy, uint256 change_type)`,
].map(e => toEventSelector(e))

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const { strategy, change_type } = z.object({
    strategy: zhexstring,
    change_type: z.bigint({ coerce: true })
  }).parse(data.args)

  await mq.add(mq.q.load, mq.job.load.strategyChange, {
    chainId,
    vault: address,
    strategy,
    changeType: changeType[Number(change_type)]
  })
}
