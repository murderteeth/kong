import { expect } from 'chai'
import { addresses, withYvUsdcaDb, withYvUsdtDb, withYvWethDb } from '../test.fixture'
import { mainnet, polygon } from 'viem/chains'
import { _compute, extractFees__v2, extractFees__v3, extractLockedProfit__v2, extractLockedProfit__v3 } from './apy'

describe('apy', function() {
  this.timeout(10_000)

  it('extracts v2 fees', async function() {
    const fees = await extractFees__v2(mainnet.id, addresses.v2.yvusdt, 15871070n)
    expect(fees.management).to.eq(0)
    expect(fees.performance).to.eq(.2)
  })

  it('extracts v2 locked profit', withYvUsdtDb(async function(this: Mocha.Context) {
    const lotsOfLockedProfit = await extractLockedProfit__v2(mainnet.id, addresses.v2.yvusdt, 18344466n)
    expect(lotsOfLockedProfit).to.eq(1912999444631n)

    const noLockedProfit = await extractLockedProfit__v2(mainnet.id, addresses.v2.yvusdt, 18965226n)
    expect(noLockedProfit).to.eq(0n)
  }))

  it('yvUSDT 0.4.3 @ block 18344466', withYvUsdtDb(async function(this: Mocha.Context) {
    const blockNumber = 18344466n
		const apy = await _compute(mainnet.id, addresses.v2.yvusdt, blockNumber)

    expect(apy).to.not.be.null
    if(apy === null) return

    expect(apy.blockNumber).to.eq(blockNumber)

    expect(apy.net).to.eq(0.002493204367606694)
    expect(apy.grossApr).to.eq(0.0031127013901155465)

    expect(apy.weeklyNet).to.eq(0) //because it hadn't been harvested in over a week at this point
    expect(apy.weeklyPricePerShare).to.eq(1023043n)
    expect(apy.weeklyBlockNumber).to.eq(18294456n)

    expect(apy.monthlyNet).to.eq(0.002493204367606694)
    expect(apy.monthlyPricePerShare).to.eq(1022834n)
    expect(apy.monthlyBlockNumber).to.eq(18130373n)

    expect(apy.inceptionNet).to.eq(0.019352846869146623)
    expect(apy.inceptionPricePerShare).to.eq(1000000n)
    expect(apy.inceptionBlockNumber).to.eq(15243268n)
  }))

  it('yvUSDT 0.4.3 @ block 15871070', withYvUsdtDb(async function(this: Mocha.Context) {
    const blockNumber = 15871070n
		const apy = await _compute(mainnet.id, addresses.v2.yvusdt, blockNumber)

    expect(apy).to.not.be.null
    if(apy === null) return

    expect(apy.blockNumber).to.eq(blockNumber)

    expect(apy.net).to.eq(0.008496634004203418)
    expect(apy.grossApr).to.eq(0.010576786408629246)

    expect(apy.weeklyNet).to.eq(0.009051237192868822)
    expect(apy.weeklyPricePerShare).to.eq(1001670n)
    expect(apy.weeklyBlockNumber).to.eq(15820962n)

    expect(apy.monthlyNet).to.eq(0.008496634004203418)
    expect(apy.monthlyPricePerShare).to.eq(1001147n)
    expect(apy.monthlyBlockNumber).to.eq(15656324n)

    expect(apy.inceptionNet).to.eq(0.007697361270727177)
    expect(apy.inceptionPricePerShare).to.eq(1000000n)
    expect(apy.inceptionBlockNumber).to.eq(15243268n)
  }))

  it('extracts v3 vault fees', async function() {
    const fees = await extractFees__v3(polygon.id, addresses.v3.yvusdca, 52031869n)
    expect(fees.management).to.eq(0)
    expect(fees.performance).to.eq(.1)
  })

  it('extracts v3 tokenized strat fees', async function() {
    const fees = await extractFees__v3(polygon.id, addresses.v3.aaveV3UsdcLender, 52031869n)
    expect(fees.management).to.eq(0)
    expect(fees.performance).to.eq(.05)
  })

  it('extracts v3 locked profit', withYvUsdcaDb(async function(this: Mocha.Context) {
    const lotsOfLockedProfit = await extractLockedProfit__v3(polygon.id, addresses.v3.yvusdca, 52031869n)
    expect(lotsOfLockedProfit).to.eq(1340884331n)

    const noLockedProfit = await extractLockedProfit__v3(polygon.id, addresses.v3.yvusdca, 49181585n)
    expect(noLockedProfit).to.eq(0n)
  }))

  it('yvUSDCA 3.0.1 @ block 52031869n', withYvUsdcaDb(async function(this: Mocha.Context) {
    const blockNumber = 52031869n
		const apy = await _compute(polygon.id, addresses.v3.yvusdca, blockNumber)

    expect(apy).to.not.be.null
    if(apy === null) return

    expect(apy.blockNumber).to.eq(blockNumber)

    expect(apy.net).to.eq(0.5053032615674182)
    expect(apy.grossApr).to.eq(0.4562300364137744)
    expect(apy.lockedProfit).to.eq(1340884331n)

    expect(apy.weeklyNet).to.eq(0.5053032615674182)
    expect(apy.weeklyPricePerShare).to.eq(1019009n)
    expect(apy.weeklyBlockNumber).to.eq(51764634n)

    expect(apy.monthlyNet).to.eq(0.293880331621855)
    expect(apy.monthlyPricePerShare).to.eq(1005328n)
    expect(apy.monthlyBlockNumber).to.eq(50876142n)

    expect(apy.inceptionNet).to.eq(0.13935788133629456)
    expect(apy.inceptionPricePerShare).to.eq(1000000n)
    expect(apy.inceptionBlockNumber).to.eq(49181585n)
  }))
})
