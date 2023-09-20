import { expect } from 'chai'
import { mainnet } from 'viem/chains'
import { fetchErc20PriceUsd } from './prices'

describe('prices', function() {
  this.timeout(2 * 60_000) // TODO: pricemagic is in beta, expect delays for now

  before(async function() {
    this.block = 18166519
  })

  it('returns oracle price for WETH', async function() {
    const { source, price } = await fetchErc20PriceUsd(mainnet.id, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', this.block)
    console.log(this.block, source, price)
    expect(source).to.equal('lens')
    expect(price).to.be.greaterThan(0)
  })

  it('returns magic price for yvCurve-clevCVX-f-f', async function() {
    const { source, price } = await fetchErc20PriceUsd(mainnet.id, '0xc869206adAfD3D874dB22e8BbA662E05F6257613', this.block)
    console.log(this.block, source, price)
    expect(source).to.equal('magic')
    expect(price).to.be.greaterThan(0)
  })
})
