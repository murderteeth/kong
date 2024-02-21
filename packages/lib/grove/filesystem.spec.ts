import { expect } from 'chai'
import { filesystem } from './filesystem'

describe('grove', function() {
  describe('filesystem', function() {
    this.beforeEach(async function() {
      const rando = Math.random().toString(36).substring(2, 10)
      this.root = `/test/${rando}`
    })

    this.afterEach(async function() {
      await filesystem.delete(this.root)
    })

    it('knows if a json exists', async function() {
      const path = `${this.root}/mushi.json`
      expect(await filesystem.exists(path)).to.equal(false)
      const expected = { mushi: 'mushi' }
      await filesystem.store(path, expected)
      expect(await filesystem.exists(path)).to.equal(true)
    })

    it('stores json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await filesystem.store(path, expected)
      expect(await filesystem.get(path)).to.deep.equal(expected)
    })

    it('lists json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await filesystem.store(path, expected)
      const list = await filesystem.list(this.root)
      expect(list.length).to.equal(1)
      expect(list[0]).to.equal(path)
    })

    it('deletes json', async function() {
      const path = `${this.root}/mushi.json`
      const expected = { mushi: 'mushi' }
      await filesystem.store(path, expected)
      await filesystem.delete(path)
      expect((await filesystem.list(this.root)).length).to.equal(0)
    })
  })
})
