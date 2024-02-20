import { promises as fs } from 'fs'
import _path from 'path'
import { Storage } from '@google-cloud/storage'

type Grove = {
  store: (json: object, path: string) => Promise<void>
  get: (path: string) => Promise<object>
  list: (path: string) => Promise<string[]>
  delete: (path: string) => Promise<void>
}

const grovePathPrefix = _path.join(__dirname, '../../.grove')
const grovePath = (path: string) => _path.join(grovePathPrefix, path)
export const filesystem: Grove = {
  store: async (json, path) => {
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

const GROVE_BUCKET = process.env.GROVE_BUCKET
const GROVE_STORAGE_KEY = process.env.GROVE_STORAGE_KEY
const USE_BUCKET = GROVE_BUCKET !== undefined && GROVE_STORAGE_KEY !== undefined
const __storage = GROVE_STORAGE_KEY ? new Storage({ keyFilename: GROVE_STORAGE_KEY }) : undefined
const __bucket = __storage && GROVE_BUCKET ? __storage.bucket(GROVE_BUCKET) : undefined
const removeLeadingSlash = (path: string) => path.startsWith('/') ? path.slice(1) : path
export const bucket: Grove = {
  store: async (json, path) => {
    if(!__bucket) throw new Error('!bucket')
    const file = __bucket.file(removeLeadingSlash(path))
    await file.save(JSON.stringify(json))
  },
  get: async (path) => {
    if(!__bucket) throw new Error('!bucket')
    const file = __bucket.file(removeLeadingSlash(path))
    const data = await file.download()
    return JSON.parse(data.toString())
  },
  list: async (path) => {
    if(!__bucket) throw new Error('!bucket')
    const [files] = await __bucket.getFiles({ prefix: removeLeadingSlash(path) })
    return files.map(file => `/${file.name}`)
  },
  delete: async (path) => {
    if(!__bucket) throw new Error('!bucket')
    if (path.includes('.')) {
      await __bucket.file(removeLeadingSlash(path)).delete()
    } else {
      await __bucket.deleteFiles({ prefix: removeLeadingSlash(path) })
    }
  }
}

const grove: Grove = USE_BUCKET ? bucket : filesystem
export default grove
