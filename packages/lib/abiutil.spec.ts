import { expect } from 'chai'
import abiutil from './abiutil'

describe('abi', function() {
  it('loads', async function() {
    const abi = await abiutil.load('yearn/3/registry')
    expect(abi).to.be.an('array')
  })

  it('filters events', async function() {
    const abi = await abiutil.load('yearn/3/registry')
    const events = abiutil.events(abi)
    expect(events.length).to.eq(3)
  })

  it('filters fields', async function() {
    const abi = await abiutil.load('yearn/3/registry')
    const fields = abiutil.fields(abi)
    expect(fields.length).to.eq(8)
  })
})
