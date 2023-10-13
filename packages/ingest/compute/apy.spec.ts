import { expect } from 'chai'
import { addresses, withYvUsdtDb } from '../test.fixture'
import { mainnet } from 'viem/chains'
import { _compute } from './apy'

describe.only('apy', function() {
  this.timeout(10_000)

  it('yvUSDT 0.4.3 @ block 18344466', withYvUsdtDb(async function(this: Mocha.Context) {
    const blockNumber = 18344466n
		const apy = await _compute(mainnet.id, addresses.yvusdt, blockNumber)

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
		const apy = await _compute(mainnet.id, addresses.yvusdt, blockNumber)

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
})
