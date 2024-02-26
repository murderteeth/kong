import { Stride, StrideSchema } from '../types'
import { bucket } from './bucket'
import { filesystem } from './filesystem'

export type GroveCore = {
  exists: (path: string) => Promise<boolean>
  store: (path: string, json: {}) => Promise<void>
  get: (path: string) => Promise<{}>
  list: (path: string) => Promise<string[]>
  delete: (path: string) => Promise<void>
}

export type GrovePeriphery = {
  stridesPath: (chainId: number, address: `0x${string}`) => string
  fetchStrides: (chainId: number, address: `0x${string}`) => Promise<Stride[]>
  storeStrides: (chainId: number, address: `0x${string}`, strides: Stride[]) => Promise<void>
  getLogs: (chainId: number, address: `0x${string}`, from: bigint, to: bigint) => Promise<{}[]>
}

function bindPeriphery(grove: GroveCore): GroveCore & GrovePeriphery {
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

  const getLogs = async (chainId: number, address: `0x${string}`, from: bigint, to: bigint) => {
    const result: {}[] = []
    const logpaths = await grove.list(`evmlog/${chainId}/${address}`)
    for (const logpath of logpaths) {
      if (logpath.endsWith('strides.json')) continue
      const segments = logpath.split('/')
      const [blockNumberString] = segments[segments.length - 1].split('-')
      const blockNumber = BigInt(blockNumberString)
      if (blockNumber < from || blockNumber > to) continue
      result.push(await grove.get(logpath))
    }
    return result
  }

  return { ...grove, stridesPath, fetchStrides, storeStrides, getLogs }
}

export default function grove(useFiles?: boolean): GroveCore & GrovePeriphery {
  const useBucket = !useFiles && process.env.GROVE_BUCKET !== undefined && process.env.GROVE_STORAGE_KEY !== undefined
  const result = useBucket ? bucket : filesystem
  return bindPeriphery(result)
}
