import { expect } from 'chai'
import path from 'path'
import fs from 'fs/promises'
import { requireHooks } from '.'

describe('abis', function() {
  describe('hook resolver', function() {
    const root = path.join(__dirname, '.spec')

    beforeEach(async function() {
      await fs.mkdir(root, { recursive: true })
      await fs.mkdir(path.join(root, 'event/Transfer'), { recursive: true })
      await fs.writeFile(path.join(root, 'event/Transfer/hook.ts'), '')
      await fs.mkdir(path.join(root, 'x/y/z/event/Transfer'), { recursive: true })
      await fs.writeFile(path.join(root, 'x/y/z/event/Transfer/hook.ts'), '')
      await fs.mkdir(path.join(root, 'x/y/z/snapshot'), { recursive: true })
      await fs.writeFile(path.join(root, 'x/y/z/snapshot/hook.ts'), '')
      await fs.mkdir(path.join(root, 'x/j/k/event/Transfer'), { recursive: true })
      await fs.writeFile(path.join(root, 'x/j/k/event/Transfer/hook.ts'), '')
      await fs.mkdir(path.join(root, 'a/b/event'), { recursive: true })
      await fs.writeFile(path.join(root, 'a/b/event/hook.ts'), '')
    })

    afterEach(async function() {
      await fs.rm(root, { recursive: true })
    })

    it('resolves paths', async function() {
      const resolveHooks = await requireHooks(root)
      expect(resolveHooks('')).to.have.length(5)
      expect(resolveHooks('', 'event')).to.have.length(4)
      expect(resolveHooks('', 'snapshot')).to.have.length(1)

      expect(resolveHooks('x')).to.have.length(4)
      expect(resolveHooks('x', 'event')).to.have.length(3)
      expect(resolveHooks('x', 'snapshot')).to.have.length(1)

      expect(resolveHooks('x/y/z')).to.have.length(3)
      expect(resolveHooks('x/y/z', 'event')).to.have.length(2)
      expect(resolveHooks('x/y/z', 'snapshot')).to.have.length(1)

      expect(resolveHooks('x/j/k')).to.have.length(2)
      expect(resolveHooks('x/j/k', 'event')).to.have.length(2)
      expect(resolveHooks('x/j/k', 'snapshot')).to.have.length(0)

      expect(resolveHooks('a/b')).to.have.length(2)
      expect(resolveHooks('a/b', 'event')).to.have.length(2)
      expect(resolveHooks('a/b', 'snapshot')).to.have.length(0)
    })
  })
})
