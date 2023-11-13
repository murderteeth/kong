import { expect } from 'chai'
import { arbitrum } from 'viem/chains'
import { extractRiskGroups } from './risk'

describe('risk', function() {
  this.timeout(30_000) // risk extract might be slow

  it.skip('extracts risk groups', async function() {
    const groups = await extractRiskGroups(arbitrum.id)
    expect(groups).to.be.an('array')
    const curve = groups.find(g => g.name === 'Curve')
    expect(curve).to.be.a('object')
    expect(curve?.strategies.length).to.be.greaterThan(0)
  })
})
