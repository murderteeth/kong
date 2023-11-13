import { expect } from 'chai'
import { extractStrategyMetas, extractTokenMeta } from './meta'
import { arbitrum, mainnet } from 'viem/chains'
import { addresses } from '../test.fixture'

describe('meta', function() {
  this.timeout(30_000) // meta extract might be slow

  it.skip('extracts stragtey meta', async function() {
    const metas = await extractStrategyMetas(arbitrum.id)
    expect(metas).to.be.an('object')
    expect(metas['0x19e70E3195fEC1A33745D9260Bf26c3f915Bb0CC']).to.be.a('string')
    expect(metas['0xcDD989d84f9B63D2f0B1906A2d9B22355316dE31']).to.be.a('string')
  })

  it.skip('extracts token meta', async function() {
    const meta = await extractTokenMeta(mainnet.id, addresses.weth)
    expect(meta).to.be.an('string')
  })
})
