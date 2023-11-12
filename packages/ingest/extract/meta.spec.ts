import { expect } from 'chai'
import { extractStrategyMetas, extractTokenMeta } from './meta'
import { mainnet } from 'viem/chains'
import { addresses } from '../test.fixture'

describe('meta', function() {
  this.timeout(30_000) // loading metas is slow

  it.skip('extracts stragtey meta', async function() {
    const metas = await extractStrategyMetas(mainnet.id)
    expect(metas).to.be.an('object')
    expect(metas[addresses.strategystEthAccumulator_v2]).to.be.a('string')
    expect(metas[addresses.strategyLenderYieldOptimiser]).to.be.a('string')
  })

  it.skip('extracts token meta', async function() {
    const meta = await extractTokenMeta(mainnet.id, addresses.weth)
    expect(meta).to.be.an('string')
  })
})
