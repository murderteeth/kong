import { expect } from 'chai'
import { extractStrategyMetas, extractTokenMetas } from './meta'
import { arbitrum } from 'viem/chains'

describe('meta', function() {
  this.timeout(30_000) // meta extract might be slow

  it.skip('extracts stragtey meta', async function() {
    const metas = await extractStrategyMetas(arbitrum.id)
    expect(metas).to.be.an('object')
    expect(metas['0x19e70e3195fec1a33745d9260bf26c3f915bb0cc'].description).to.be.a('string')
    expect(metas['0xccfff90a596fcc0b549a5f69a70de0a9c5295352'].description).to.be.a('string')
  })

  it.skip('extracts token meta', async function() {
    const metas = await extractTokenMetas(arbitrum.id)
    expect(metas).to.be.an('object')
    expect(metas['0x11cdb42b0eb46d95f990bedd4695a6e3fa034978'].description).to.be.a('string')
    expect(metas['0x30df229cefa463e991e29d42db0bae2e122b2ac7'].description).to.be.a('string')
  })
})
