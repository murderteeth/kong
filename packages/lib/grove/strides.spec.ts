import { expect } from 'chai'
import strides from './strides'

describe('grove', function() {
  describe('strides', function() {
    it.only('adds strides', async function() {
      expect(strides.add([], { from: 0n, to: 100n })).to.deep.equal([{ from: 0n, to: 100n }])
      expect(strides.add([{ from: 0n, to: 100n }], { from: 0n, to: 100n })).to.deep.equal([{ from: 0n, to: 100n }])
      expect(strides.add([{ from: 0n, to: 100n }], { from: 50n, to: 100n })).to.deep.equal([{ from: 0n, to: 100n }])
      expect(strides.add([{ from: 0n, to: 100n }], { from: 50n, to: 150n })).to.deep.equal([{ from: 0n, to: 150n }])
      expect(strides.add([{ from: 0n, to: 100n }], { from: 200n, to: 300n })).to.deep.equal([{ from: 0n, to: 100n }, { from: 200n, to: 300n }])
      expect(strides.add([{ from: 0n, to: 100n }, { from: 200n, to: 300n }], { from: 100n, to: 200n })).to.deep.equal([{ from: 0n, to: 300n }])
      expect(strides.add([{ from: 0n, to: 100n }, { from: 200n, to: 300n }], { from: 101n, to: 199n })).to.deep.equal([{ from: 0n, to: 300n }])
    })
  })
})
