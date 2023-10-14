import { expect } from 'chai'
import { addresses, withYvWethDb } from '../test.fixture'
import { _compute } from './harvestApr'
import { mainnet } from 'viem/chains'

describe('harvest apr', function() {
  it('nulls on no data', async function() {
    const apr = await _compute(mainnet.id, addresses.strategystEthAccumulator_v2, 18116045n)
    expect(apr).to.be.null
  })

  it('computes gross and net', withYvWethDb(async function(this: Mocha.Context) {
    const apr = await _compute(mainnet.id, addresses.strategystEthAccumulator_v2, 18116045n)
    expect(apr?.gross).to.equal(0.029965778368353662)
    expect(apr?.net).to.equal(0.02397262269468293)
    expect(apr?.blockNumber).to.equal('18116044')
  }))
})
