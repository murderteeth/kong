import { promises as fs } from 'fs'
import _path from 'path'
import { Grove } from '.'

const grovePathPrefix = _path.join(__dirname, '../../.grove')
const grovePath = (path: string) => _path.join(grovePathPrefix, path)
export const filesystem: Grove = {
  exists: async (path) => {
    try {
      await fs.access(grovePath(path))
      return true
    } catch (error) {
      return false
    }
  },
  store: async (path, json) => {
    await fs.mkdir(_path.dirname(grovePath(path)), { recursive: true })
    await fs.writeFile(grovePath(path), JSON.stringify(json))
  },
  get: async (path) => {
    const data = await fs.readFile(grovePath(path), 'utf-8')
    return JSON.parse(data)
  },
  list: async (path) => {
    return (await fs.readdir(grovePath(path))).map(file => _path.join(grovePath(path), file).replace(grovePathPrefix, ''))
  },
  delete: async (path) => {
    try {
      await fs.unlink(grovePath(path))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EISDIR') {
        await fs.rm(grovePath(path), { recursive: true })
      } else {
        throw error
      }
    }
  }
}
