import { expect } from 'chai'
import grove from '.'

describe('grove', function() {
  const chainId = 31337
  const address = '0x000test000'
  const logpath = `evmlog/${chainId}/${address}/0x000topic000/0-0-0x000tx000-0.json`

  describe('filesystem', function() {
    this.beforeAll(function() {
      this.grove = grove(true)
    })

    this.beforeEach(async function() {
      await this.grove.store(logpath, { mushi: 'mushi' })
    })

    this.afterEach(async function() {
      await this.grove.delete(logpath)
    })

    it('gets logs', async function() {
      const logs = await this.grove.fetchLogs(chainId, address, 0n, 1n)
      expect(logs.length).to.equal(1)
      expect(await this.grove.get(logpath)).to.deep.equal({ mushi: 'mushi' })
    })
  })

  describe('bucket', function() {
    this.beforeAll(function() {
      if(!process.env.GROVE_BUCKET || !process.env.GROVE_STORAGE_KEY) return this.skip()
      this.grove = grove()
    })

    this.beforeEach(async function() {
      await this.grove.store(logpath, { mushi: 'mushi' })
    })

    this.afterEach(async function() {
      await this.grove.delete(logpath)
    })

    it('gets logs', async function() {
      const logs = await this.grove.fetchLogs(chainId, address, 0n, 1n)
      expect(logs.length).to.equal(1)
      expect(await this.grove.get(logpath)).to.deep.equal({ mushi: 'mushi' })
    })
  })
})
