import { abisConfig, mq } from 'lib'
import * as things from '../things'

export default class AbisFanout {
  async fanout(data: any) {
    for (const abi of abisConfig.abis) {
      for (const source of abi.sources) {
        console.info('🤝', 'source', 'abiPath', abi.abiPath, source.chainId, source.address)
        const _data = { ...data, chainId: source.chainId, abi, source }
        await mq.add(mq.job.fanout.events, _data)
        await mq.add(mq.job.extract.snapshot, _data)
        await mq.add(mq.job.fanout.timeseries, _data)
      }

      if (abi.things) {
        const _things = await things.get(abi.things)
        for (const _thing of _things) {
          console.info('🤝', 'thing', 'abiPath', abi.abiPath, _thing.chainId, _thing.address)
          const _data = { 
            ...data, 
            chainId: _thing.chainId, 
            abi, 
            source: { 
            chainId: _thing.chainId, 
            address: _thing.address, 
            inceptBlock: _thing.defaults.inceptBlock,
            inceptTime: _thing.defaults.inceptTime
          } }
          await mq.add(mq.job.fanout.events, _data)
          await mq.add(mq.job.extract.snapshot, _data)
          await mq.add(mq.job.fanout.timeseries, _data)
        }
      }
    }
  }
}
