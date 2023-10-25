import { expect } from 'chai'
import { addresses, withYvWethDb } from '../test.fixture'
import { mainnet } from 'viem/chains'
import { _compute } from './tvl'
import { rpcs } from 'lib/rpcs'

describe('tvl', function() {
  it('yvWETH 0.4.2 @ block 18417431', withYvWethDb(async function(this: Mocha.Context) {
    const block = await rpcs.next(mainnet.id).getBlock({ blockNumber: 18417431n })
		const tvl = await _compute(mainnet.id, addresses.yvweth, block.timestamp)
    expect(tvl).to.be.almost(107_045_649, 1)
  }))
})
