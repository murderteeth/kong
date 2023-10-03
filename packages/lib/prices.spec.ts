import { expect } from 'chai'
import { mainnet } from 'viem/chains'
import { fetchErc20PriceUsd } from './prices'

describe('prices', function() {
  this.timeout(2 * 60_000) // TODO: yprice is in beta, expect delays

  before(async function() {
    this.block = 18166519n
  })

  it('returns lens price for WETH', async function() {
    const { source, price } = await fetchErc20PriceUsd(mainnet.id, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', this.block)
    expect(source).to.equal('lens')
    expect(price).to.be.greaterThan(0)
  })

  it('returns yprice for yvCurve-clevCVX-f-f', async function() {
    if(!JSON.parse(process.env.YPRICE_ENABLED || 'false')) return this.skip()
    const { source, price } = await fetchErc20PriceUsd(mainnet.id, '0xc869206adAfD3D874dB22e8BbA662E05F6257613', this.block)
    console.log('source, price', source, price)
    expect(source).to.equal('yprice')
    expect(price).to.be.greaterThan(0)
  })
})
