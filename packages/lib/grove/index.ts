import { Price, PriceSchema, Stride, StrideSchema } from '../types'
import { bucket } from './bucket'
import { disabled } from './disabled'
import { filesystem } from './filesystem'

export type GroveCore = {
  exists: (path: string) => Promise<boolean>
  store: (path: string, json: {}) => Promise<void>
  get: (path: string) => Promise<{}>
  list: (path: string) => Promise<string[]>
  delete: (path: string) => Promise<void>
  provider: () => string
}

export type GrovePeriphery = {
  stridesPath: (chainId: number, address: `0x${string}`) => string
  fetchStrides: (chainId: number, address: `0x${string}`) => Promise<Stride[]>
  storeStrides: (chainId: number, address: `0x${string}`, strides: Stride[]) => Promise<void>
  pricePath: (chainId: number, token: `0x${string}`, blockNumber: bigint) => string
  fetchPrice: (chainId: number, token: `0x${string}`, blockNumber: bigint) => Promise<Price|undefined>
  storePrice: (price: Price) => Promise<void>
  getLogs: (chainId: number, address: `0x${string}`, from: bigint, to: bigint) => Promise<{}[]>
}

function bindPeriphery(grove: GroveCore): GroveCore & GrovePeriphery {
  const stridesPath = (chainId: number, address: `0x${string}`) => `evmlog/${chainId}/${address}/strides.json`

  const fetchStrides = async (chainId: number, address: `0x${string}`) => {
    const path = stridesPath(chainId, address)
    if (await grove.exists(path)) {
      try {
        return StrideSchema.array().parse(await grove.get(path))
      } catch(error) {
        console.warn('🚨', 'fetchStrides', path, error)
        throw error
      }
    } else {
      return []
    }
  }

  const storeStrides = async (chainId: number, address: `0x${string}`, strides: Stride[]) => {
    await grove.store(stridesPath(chainId, address), strides)
  }

  const pricePath = (chainId: number, address: `0x${string}`, blockNumber: bigint) => `price/${chainId}/${address}/${blockNumber}.json`

  const fetchPrice = async (chainId: number, address: `0x${string}`, blockNumber: bigint) => {
    const path = pricePath(chainId, address, blockNumber)
    if (await grove.exists(path)) {
      return PriceSchema.parse(await grove.get(path))
    } else {
      return undefined
    }
  }

  const storePrice = async (price: Price) => {
    const path = pricePath(price.chainId, price.address, price.blockNumber)
    await grove.store(path, price)
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

  return { 
    ...grove, 
    stridesPath, fetchStrides, storeStrides,
    pricePath, fetchPrice, storePrice,
    getLogs 
  }
}

export default function grove(useFiles?: boolean): GroveCore & GrovePeriphery {
  const mode = process.env.GROVE || 'disabled'
  switch (mode) {
    case 'bucket':
      return bindPeriphery(bucket)
    case 'filesystem':
      return bindPeriphery(filesystem)
    case 'disabled':
      return bindPeriphery(disabled)
    default:
      throw new Error(`Unknown GROVE_MODE: ${mode}`)
  
  }
}
