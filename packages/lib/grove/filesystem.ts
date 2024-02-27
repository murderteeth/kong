import { promises as fs } from 'fs'
import _path from 'path'
import { GroveCore } from '.'

const grovePathPrefix = _path.join(__dirname, '../../.grove')
const grovePath = (path: string) => _path.join(grovePathPrefix, path)

const list = async (path: string): Promise<string[]> => {
  const fullPath = grovePath(path)
  const entries = await fs.readdir(fullPath, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = _path.join(fullPath, entry.name)
    if (entry.isDirectory()) {
      return list(entryPath.replace(grovePathPrefix, ''))
    } else {
      return [entryPath.replace(grovePathPrefix, '')]
    }
  }))
  return files.flat()
}

export const filesystem: GroveCore = {
  provider: () => 'filesystem',
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
    try {
      return JSON.parse(data)
    } catch(error) {
      console.warn('🚨', 'get', data, 'eod')
      throw error
    }
  },
  list,
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
