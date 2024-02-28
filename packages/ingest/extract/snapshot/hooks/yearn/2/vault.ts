import { Queue } from 'bullmq'
import { parseAbi, zeroAddress } from 'viem'
import { Hook } from '../../..'
import { rpcs } from 'lib/rpcs'

export default class VaultHook implements Hook {
  queues: { [key: string]: Queue } = {}
  up = async () => {}
  down = async () => {}
  process = async (chainId: number, address: `0x${string}`, _: any) => {
    const abi = parseAbi(['function withdrawalQueue(uint256) view returns (address)'])

    const multicall = await rpcs.next(chainId).multicall({ contracts: [
      { args: [0n], address, functionName: 'withdrawalQueue', abi },
      { args: [1n], address, functionName: 'withdrawalQueue', abi },
      { args: [2n], address, functionName: 'withdrawalQueue', abi },
      { args: [3n], address, functionName: 'withdrawalQueue', abi },
      { args: [4n], address, functionName: 'withdrawalQueue', abi },
      { args: [5n], address, functionName: 'withdrawalQueue', abi },
      { args: [6n], address, functionName: 'withdrawalQueue', abi },
      { args: [7n], address, functionName: 'withdrawalQueue', abi },
      { args: [8n], address, functionName: 'withdrawalQueue', abi },
      { args: [9n], address, functionName: 'withdrawalQueue', abi },
      { args: [10n], address, functionName: 'withdrawalQueue', abi },
      { args: [11n], address, functionName: 'withdrawalQueue', abi },
      { args: [12n], address, functionName: 'withdrawalQueue', abi },
      { args: [13n], address, functionName: 'withdrawalQueue', abi },
      { args: [14n], address, functionName: 'withdrawalQueue', abi },
      { args: [15n], address, functionName: 'withdrawalQueue', abi },
      { args: [16n], address, functionName: 'withdrawalQueue', abi },
      { args: [17n], address, functionName: 'withdrawalQueue', abi },
      { args: [18n], address, functionName: 'withdrawalQueue', abi },
      { args: [19n], address, functionName: 'withdrawalQueue', abi }
    ]})

    const withdrawalQueue = multicall.filter(result => result.status === 'success' && result.result && result.result !== zeroAddress)
    .map(result => result.result as `0x${string}`)

    return { withdrawalQueue }
  }
}
