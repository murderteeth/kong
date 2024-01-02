import { parseAbi } from 'viem'

export interface Factory {
  chainId: number
  address: `0x${string}`
  incept: bigint
  handler: 'debtManagerFactory'
  events?: readonly any[]
}

export const contracts: Factory[] = [
  {
    chainId: 137,
    address: '0x0D1F62247035BBFf16742B0f31e8e2Af3aCd6e67' as `0x${string}`,
    incept: 51403739n,
    handler: 'debtManagerFactory',
    events: parseAbi([
      `event NewDebtAllocator(address indexed allocator, address indexed vault)`
    ])
  }
]
