import { bucket } from './bucket'
import { filesystem } from './filesystem'

export type Grove = {
  exists: (path: string) => Promise<boolean>
  store: (path: string, json: object) => Promise<void>
  get: (path: string) => Promise<object>
  list: (path: string) => Promise<string[]>
  delete: (path: string) => Promise<void>
}

export default function grove(): Grove {
  const useBucket = process.env.GROVE_BUCKET !== undefined && process.env.GROVE_STORAGE_KEY !== undefined
  return useBucket ? bucket : filesystem
}
