import _path from 'path'
import { Storage } from '@google-cloud/storage'
import { Grove } from '.'

const getBucket = () => {
  if(!process.env.GROVE_BUCKET) throw new Error('!process.env.GROVE_BUCKET')
  if(!process.env.GROVE_STORAGE_KEY) throw new Error('!process.env.GROVE_STORAGE_KEY')
  const storage = new Storage({ keyFilename: process.env.GROVE_STORAGE_KEY })
  return storage.bucket(process.env.GROVE_BUCKET)
}

const removeLeadingSlash = (path: string) => path.startsWith('/') ? path.slice(1) : path
export const bucket: Grove = {
  exists: async (path) => {
    const __bucket = getBucket()
    const file = __bucket.file(removeLeadingSlash(path))
    const [exists] = await file.exists()
    return exists
  },
  store: async (path, json) => {
    const __bucket = getBucket()
    const file = __bucket.file(removeLeadingSlash(path))
    await file.save(JSON.stringify(json))
  },
  get: async (path) => {
    const __bucket = getBucket()
    const file = __bucket.file(removeLeadingSlash(path))
    const data = await file.download()
    return JSON.parse(data.toString())
  },
  list: async (path) => {
    const __bucket = getBucket()
    const [files] = await __bucket.getFiles({ prefix: removeLeadingSlash(path) })
    return files.map(file => `/${file.name}`)
  },
  delete: async (path) => {
    const __bucket = getBucket()
    if (path.includes('.')) {
      await __bucket.file(removeLeadingSlash(path)).delete()
    } else {
      await __bucket.deleteFiles({ prefix: removeLeadingSlash(path) })
    }
  }
}
