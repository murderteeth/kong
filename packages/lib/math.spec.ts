import { expect } from 'chai'
import { div } from './math'

describe('math', function() {
  describe('div', function() {
    it('NaN on zero denominator', async function() {
      expect(div(1n, 0n)).to.be.NaN
    })
  
    it('.5 on 1/2', async function() {
      expect(div(1n, 2n)).to.eq(0.5)
    })
  })
})
