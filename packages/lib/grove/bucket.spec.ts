import { expect } from 'chai'
import { bucket } from './bucket'

describe('grove', function() {
  describe('bucket', function() {
    this.beforeAll(function() {
      if(!process.env.GROVE_BUCKET || !process.env.GROVE_STORAGE_KEY) return this.skip()
    })

    this.beforeEach(async function() {
      const rando = Math.random().toString(36).substring(2, 10)
      this.root = `/test/${rando}`
    })

    this.afterEach(async function() {
      await bucket.delete(this.root)
    })

    it('knows if a json exists', async function() {
      const path = `${this.root}/mushi.json`
      expect(await bucket.exists(path)).to.equal(false)
      const expected = { mushi: 'mushi' }
      await bucket.store(path, expected)
      expect(await bucket.exists(path)).to.equal(true)
    })

    it('stores json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await bucket.store(path, expected)
      expect(await bucket.get(path)).to.deep.equal(expected)
    })

    it('lists json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await bucket.store(path, expected)
      const list = await bucket.list(this.root)
      expect(list.length).to.equal(1)
      expect(list[0]).to.equal(path)
    })

    it('deletes json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await bucket.store(path, expected)
      await bucket.delete(path)
      expect((await bucket.list(this.root)).length).to.equal(0)
    })
  })
})
