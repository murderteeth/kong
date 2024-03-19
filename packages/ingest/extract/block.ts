import { chains, mq, types } from 'lib'
import { latestBlocks, rpcs } from '../rpcs'

export class BlockExtractor {
  async extract() {
    for(const chain of chains) {
      const rpc = rpcs.next(chain.id)
      const block = await rpc.getBlock()

      latestBlocks[rpc.chain?.id as number] = {
        blockNumber: block.number,
        blockTime: block.timestamp
      }

      await mq.add(mq.job.load.block, {
        chainId: rpc.chain?.id,
        blockNumber: block.number,
        blockTime: block.timestamp
      } as types.LatestBlock, {
        jobId: `${rpc.chain?.id}-${block.number}`
      })
    }
  }
}
