import { expect } from 'chai'
import { filesystem, bucket } from './grove'

describe('grove', function() {
  describe('filesystem', function() {
    this.beforeEach(async function() {
      const rando = Math.random().toString(36).substring(2, 10)
      this.root = `/test/${rando}`
    })

    this.afterEach(async function() {
      await filesystem.delete(this.root)
    })

    it('stores json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await filesystem.store(expected, path)
      expect(await filesystem.get(path)).to.deep.equal(expected)
    })

    it('lists json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await filesystem.store(expected, path)
      const list = await filesystem.list(this.root)
      expect(list.length).to.equal(1)
      expect(list[0]).to.equal(path)
    })

    it('deletes json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await filesystem.store(expected, path)
      await filesystem.delete(path)
      expect((await filesystem.list(this.root)).length).to.equal(0)
    })
  })

  describe.skip('bucket', function() {
    this.beforeEach(async function() {
      const rando = Math.random().toString(36).substring(2, 10)
      this.root = `/test/${rando}`
    })

    this.afterEach(async function() {
      await bucket.delete(this.root)
    })

    it('stores json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await bucket.store(expected, path)
      expect(await bucket.get(path)).to.deep.equal(expected)
    })

    it('lists json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await bucket.store(expected, path)
      const list = await bucket.list(this.root)
      expect(list.length).to.equal(1)
      expect(list[0]).to.equal(path)
    })

    it('deletes json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await bucket.store(expected, path)
      await bucket.delete(path)
      expect((await bucket.list(this.root)).length).to.equal(0)
    })
  })
})
