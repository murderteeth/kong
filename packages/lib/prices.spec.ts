import { expect } from 'chai'
import { mainnet } from 'viem/chains'
import { fetchErc20PriceUsd, fetchLensPriceUsd, fetchYPriceUsd } from './prices'
import { estimateHeight } from './blocks'

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
    expect(source).to.equal('yprice')
    expect(price).to.be.greaterThan(0)
  })

  it.only('yprice', async function() {
    console.log(await fetchYPriceUsd(mainnet.id, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18306838n))
    console.log(await fetchYPriceUsd(mainnet.id, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18316838n))

    // console.log(await fetchErc20PriceUsd(mainnet.id, '0xDA68f66fC0f10Ee61048E70106Df4BDB26bAF595', 18446650n))
    // console.log(await fetchErc20PriceUsd(mainnet.id, '0xDA68f66fC0f10Ee61048E70106Df4BDB26bAF595', 18446690n))
    // console.log(await fetchErc20PriceUsd(mainnet.id, '0xDA68f66fC0f10Ee61048E70106Df4BDB26bAF595', 18446700n))

    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const block = await estimateHeight(mainnet.id, BigInt(Math.floor(date.getTime() / 1000)))
      const lensprice = await fetchLensPriceUsd(mainnet.id, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', block)
      const yprice = await fetchYPriceUsd(mainnet.id, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', block)
      console.log('price', date, block, lensprice, yprice)
    }
  })
})
