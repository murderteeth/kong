import { rpcs as _rpcs } from 'lib/rpcs'

const FULL_NODE_DEPTH = BigInt(process.env.FULL_NODE_DEPTH || 1000)

export const latestBlocks : {
  [chainId: number]: { blockNumber: bigint, blockTime: bigint }
} = {}

function useArchiveNode(chainId: number, blockNumber?: bigint) {
  if(!blockNumber) return false
  if(!latestBlocks[chainId]) return true
  return blockNumber < latestBlocks[chainId].blockNumber - FULL_NODE_DEPTH
}

export const rpcs = {
  up: async () => {
    await _rpcs.up()
  },

  down: async () => {
    await _rpcs.down()
  },

  next: (chainId: number, blockNumber?: bigint) => {
    const archive = useArchiveNode(chainId, blockNumber)

    if(archive) {
      console.log('🔥🔥🔥', 'rpc archive node')
    } else {
      console.log('💚💚💚', 'rpc full node')
    }

    return _rpcs.next(chainId, archive)
  }
}
