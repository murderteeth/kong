import { expect } from 'chai'
import { zeroAddress } from 'viem'
import { EvmLog, EvmLogSchema } from 'lib/types'
import { getFlow } from './sync'

describe('load', function() {
  describe('sync', function() {
    it('gets log flow', async function() {
      expect(getFlow([
        mockLog({ blockNumber: 1n }),
        mockLog({ blockNumber: 2n }),
        mockLog({ blockNumber: 3n })
      ], 3).length).to.eq(3)

      expect(getFlow([
        mockLog({ blockNumber: 1n }),
        mockLog({ blockNumber: 2n }),
        mockLog({ blockNumber: 3n })
      ], 2).length).to.eq(2)

      expect(getFlow([
        mockLog({ blockNumber: 1n }),
        mockLog({ blockNumber: 2n, logIndex: 0 }),
        mockLog({ blockNumber: 2n, logIndex: 1 }),
      ], 2).length).to.eq(3)

      expect(getFlow([
        mockLog({ blockNumber: 1n, logIndex: 0}),
        mockLog({ blockNumber: 1n, logIndex: 1 }),
        mockLog({ blockNumber: 2n, logIndex: 0 }),
        mockLog({ blockNumber: 2n, logIndex: 1 }),
      ], 2).length).to.eq(2)
    })
  })
})

function mockLog(partial?: Partial<EvmLog>) {
  return EvmLogSchema.parse({
    chainId: 0,
    address: zeroAddress,
    eventName: '',
    signature: '0x',
    topics: [],
    args: {},
    post: {},
    blockNumber: 0n,
    blockTime: 0n,
    logIndex: 0,
    transactionHash: '0x',
    transactionIndex: 0,
    ...partial
  })
}
