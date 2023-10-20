import { expect } from 'chai'
import { computeConcurrency } from './mq'

describe('mq', function() {
  it('computes worker concurrency', async function() {
    expect(computeConcurrency(0)).to.equal(1)
    expect(computeConcurrency(1)).to.equal(1)
    expect(computeConcurrency(100)).to.equal(10)
    expect(computeConcurrency(200)).to.equal(20)
    expect(computeConcurrency(2000)).to.equal(20)
    expect(computeConcurrency(20_000)).to.equal(20)
    expect(computeConcurrency(20_000_000)).to.equal(20)
  })
})
