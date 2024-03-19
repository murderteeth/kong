import { Processor } from 'lib/processor'
import { EvmLog } from 'lib/types'
import { Log } from 'viem'

const hookTypes = ['event', 'snapshot', 'timeseries'] as const
export type HookType = typeof hookTypes[number]

export interface HookModule {
  topics?: `0x${string}`[]
  outputLabel?: string
  default: (chainId: number, address: `0x${string}`, data: any) => Promise<any>
}

export interface AbiHook {
  type: HookType
  abiPath: string
  module: HookModule
}

export interface ResolveHooks {
  (path: string, type?: HookType): AbiHook[]
}

export interface EventHook extends Processor {
  process: (chainId: number, address: `0x${string}`, log: Log|EvmLog) => Promise<any|undefined>
}

export interface SnapshotHook extends Processor {
  process: (chainId: number, address: `0x${string}`, snapshot: any) => Promise<any|undefined>
}
