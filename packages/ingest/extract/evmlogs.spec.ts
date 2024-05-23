import { expect } from 'chai'
import { containsBlacklistedAddress, extractLogArgs } from './evmlogs'

describe('extract/evmlogs', function() {
  it('converts log args', async function() {
    expect(extractLogArgs({})).to.deep.equal({})
    expect(extractLogArgs({ args: {} })).to.deep.equal({})
    expect(extractLogArgs({ args: { mushi: 'nihao' } })).to.deep.equal({ mushi: 'nihao' })
    expect(extractLogArgs({ args: [] })).to.deep.equal({})
    expect(extractLogArgs({ args: ['hola'] })).to.deep.equal({ arg0: 'hola' })
  })

  it('detects blacklisted addresses', async function() {
    const blacklisted = containsBlacklistedAddress(137, { arg0: '0x08319Fb7cAD5c0CAeDA4AB01b6270Cc560a603eA' })
    expect(blacklisted.result).to.equal(true)
    expect(blacklisted.address).to.equal('0x08319Fb7cAD5c0CAeDA4AB01b6270Cc560a603eA')
  })

  it('doesn\'t make false blacklist positives', async function() {
    const blacklisted = containsBlacklistedAddress(137, { arg0: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' })
    expect(blacklisted.result).to.equal(false)
    expect(blacklisted.address).to.be.undefined
  })
})
