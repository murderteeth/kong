import { Stride, StrideSchema } from '../types'
import { bucket } from './bucket'
import { filesystem } from './filesystem'

export type Grove = {
  exists: (path: string) => Promise<boolean>
  store: (path: string, json: object) => Promise<void>
  get: (path: string) => Promise<object>
  list: (path: string) => Promise<string[]>
  delete: (path: string) => Promise<void>
}

export type StrideFunctions = {
  stridesPath: (chainId: number, address: `0x${string}`) => string
  fetchStrides: (chainId: number, address: `0x${string}`) => Promise<Stride[]>
  storeStrides: (chainId: number, address: `0x${string}`, strides: Stride[]) => Promise<void>
}

function bindStrideFunctions(grove: Grove): Grove & StrideFunctions {
  const stridesPath = (chainId: number, address: `0x${string}`) => `evmlog/${chainId}/${address}/strides.json`
  const fetchStrides = async (chainId: number, address: `0x${string}`) => {
    const path = stridesPath(chainId, address)
    return await grove.exists(path)
    ? StrideSchema.array().parse(await grove.get(path)) 
    : []
  }
  const storeStrides = async (chainId: number, address: `0x${string}`, strides: Stride[]) => {
    await grove.store(stridesPath(chainId, address), strides)
  }
  return { ...grove, stridesPath, fetchStrides, storeStrides }
}

export default function grove(): Grove & StrideFunctions {
  const useBucket = process.env.GROVE_BUCKET !== undefined && process.env.GROVE_STORAGE_KEY !== undefined
  const result = useBucket ? bucket : filesystem
  return bindStrideFunctions(result)
}
