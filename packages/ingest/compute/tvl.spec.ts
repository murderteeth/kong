import { expect } from 'chai'
import { addresses, withYvWethDb } from '../test.fixture'
import { mainnet } from 'viem/chains'
import { _compute } from './tvl'
import { rpcs } from '../rpcs'

describe('tvl', function() {
  it('yvWETH 0.4.2 @ block 18417431', withYvWethDb(async function(this: Mocha.Context) {
    const blockNumber = 18417431n
    const block = await rpcs.next(mainnet.id, blockNumber).getBlock({ blockNumber })
		const { price, tvl } = await _compute(mainnet.id, addresses.yvweth, block.timestamp)
    expect(price).to.be.almost(1_833, 1)
    expect(tvl).to.be.almost(107_045_649, 1)
  }))
})
