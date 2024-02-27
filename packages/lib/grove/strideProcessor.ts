import { Stride } from '../types'
import { strider } from '..'
import grove from '.'

class BatchProcessingUnit {
  private chainId: number
  private address: `0x${string}`
  private _batch: Stride[] = []

  constructor(chainId: number, address: `0x${string}`) {
    this.chainId = chainId
    this.address = address
  }

  batch = (stride: Stride) => {
    this._batch.push(stride)
  }

  process = async () => {
    if (this._batch.length === 0) return
    const freeze = [...this._batch]
    const current = await grove().fetchStrides(this.chainId, this.address)
    const next = freeze.reduce((acc, stride) => strider.add(stride, acc), current)
    try {
      await grove().storeStrides(this.chainId, this.address, next)
      for (const stride of freeze) {
        const index = this._batch.findIndex(s => s.from === stride.from && s.to === stride.to)
        if (index > -1) this._batch.splice(index, 1)
      }
    } catch(error) {
      console.warn('🚨', 'grove().storeStrides(this.chainId, this.address, next)', this.chainId, this.address)
      console.warn(this._batch)
      console.warn(freeze)
      console.warn(next)
      console.warn(error)
      console.warn()
    }
  }
}

export class StrideProcessor {
  private static instance: StrideProcessor
  private ms: number = 4000
  private interval: NodeJS.Timeout | undefined
  private bpus: { [key: string]: BatchProcessingUnit } = {}
  private bypassBpus = grove().provider() === 'filesystem'

  public static get = (): StrideProcessor => {
    if (!this.instance) {
      this.instance = new StrideProcessor()
      this.instance.up()
    }
    return this.instance
  }

  public static down = () => {
    if (this.instance) this.instance.down()
  }

  constructor() {}

  store = async (chainId: number, address: `0x${string}`, next: Stride[]) => {
    if(this.bypassBpus) {
      await grove().storeStrides(chainId, address, next)
    } else {
      throw new Error('Hot store only supported on filesystem.')
    }
  }

  batch = async (chainId: number, address: `0x${string}`, stride: Stride) => {
    const key = `${chainId}-${address}`
    if (!this.bpus[key]) this.bpus[key] = new BatchProcessingUnit(chainId, address)
    this.bpus[key].batch(stride)
  }

  cycle = async () => {
    for (const bpu of Object.values(this.bpus)) await bpu.process()
  }

  up = () => {
    console.info('⬆ stride processor up')
    this.interval = setInterval(async () => await this.cycle(), this.ms)
  }

  down = () => {
    console.info('⬇ stride processor down')
    clearInterval(this.interval)
  }
}

process.on('SIGINT', StrideProcessor.down)
process.on('SIGTERM', StrideProcessor.down)
