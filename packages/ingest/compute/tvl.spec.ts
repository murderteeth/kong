// import { expect } from 'chai'
// import { addresses, withYvWethDb } from '../test.fixture'
// import { mainnet } from 'viem/chains'
// import { _compute } from './tvl'

// describe('tvl', function() {
//   it('yvWETH 0.4.2 @ block 18417431', withYvWethDb(async function(this: Mocha.Context) {
//     const blockNumber = 18417431n
// 		const { priceUsd, tvl } = await _compute(mainnet.id, addresses.v2.yvweth, blockNumber)
//     expect(priceUsd).to.be.almost(1_833, 1)
//     expect(tvl).to.be.almost(107_045_649, 1)
//   }))
// })
