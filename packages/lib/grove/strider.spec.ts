import { expect } from 'chai'
import { add, plan } from './strider'

describe('grove', function() {
  describe('strider', function() {
    it('plans new strides', async function() {
      expect(plan(0n, 100n, undefined)).to.deep.equal([{ from: 0n, to: 100n }])
      expect(plan(0n, 100n, [])).to.deep.equal([{ from: 0n, to: 100n }])
    })
  
    it('plans around previous strides', async function() {
      expect(plan(0n, 100n, [{ from: 0n, to: 50n }]))
      .to.deep.equal([{ from: 51n, to: 100n }])
  
      expect(plan(0n, 100n, [{ from: 50n, to: 100n }]))
      .to.deep.equal([{ from: 0n, to: 49n }])
  
      expect(plan(0n, 100n, [{ from: 10n, to: 20n }, { from: 70n, to: 90n }]))
      .to.deep.equal([{ from: 0n, to: 9n }, { from: 21n, to: 69n }, { from: 91n, to: 100n }])
    })
  
    it('adds strides', async function() {
      expect(add({ from: 0n, to: 100n },    [])).to.deep.equal([{ from: 0n, to: 100n }])
      expect(add({ from: 0n, to: 100n },    [{ from: 0n, to: 100n }])).to.deep.equal([{ from: 0n, to: 100n }])
      expect(add({ from: 50n, to: 100n },   [{ from: 0n, to: 100n }])).to.deep.equal([{ from: 0n, to: 100n }])
      expect(add({ from: 50n, to: 150n },   [{ from: 0n, to: 100n }])).to.deep.equal([{ from: 0n, to: 150n }])
      expect(add({ from: 200n, to: 300n },  [{ from: 0n, to: 100n }])).to.deep.equal([{ from: 0n, to: 100n }, { from: 200n, to: 300n }])
      expect(add({ from: 100n, to: 200n },  [{ from: 0n, to: 100n }, { from: 200n, to: 300n }])).to.deep.equal([{ from: 0n, to: 300n }])
      expect(add({ from: 101n, to: 199n },  [{ from: 0n, to: 100n }, { from: 200n, to: 300n }])).to.deep.equal([{ from: 0n, to: 300n }])
      expect(add({ from: 100n, to: 199n },  [{ from: 200n, to: 300n }])).to.deep.equal([{ from: 100n, to: 300n }])
    })
  })  
})
