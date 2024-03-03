import { Processor } from 'lib/processor'
import { EvmLog } from 'lib/types'
import { Log } from 'viem'

export interface HookModule {
  topics?: `0x${string}`[]
  default: (chainId: number, address: `0x${string}`, data: any) => Promise<any>
}

export interface AbiHook {
  type: 'event'|'snapshot'
  abiPath: string
  module: HookModule
}

export interface ResolveHooks {
  (path: string, type?: 'event'|'snapshot'): AbiHook[]
}

export interface EventHook extends Processor {
  process: (chainId: number, address: `0x${string}`, log: Log|EvmLog) => Promise<any|undefined>
}

export interface SnapshotHook extends Processor {
  process: (chainId: number, address: `0x${string}`, snapshot: any) => Promise<any|undefined>
}
