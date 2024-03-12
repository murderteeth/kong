import { contracts, mq } from 'lib'
import * as things from '../things'
import { setTimeout } from 'timers/promises'

export default class ContractsFanout {
  async fanout(data: any) {
    for (const contract of contracts) {
      for (const source of contract.sources) {
        console.info('🤝', 'source', 'abiPath', contract.abiPath, source.chainId, source.address)
        const _data = { ...data, contract, source }
        await mq.add(mq.job.fanout.events, _data)
        await mq.add(mq.job.extract.snapshot, _data)
        await mq.add(mq.job.fanout.timeseries, _data)
        await setTimeout(16)
      }

      if(contract.things) {
        const _things = await things.get(contract.things)
        for (const _thing of _things) {
          console.info('🤝', 'thing', 'abiPath', contract.abiPath, _thing.chainId, _thing.address)
          const _data = { ...data, contract, source: { 
            chainId: _thing.chainId, 
            address: _thing.address, 
            inceptBlock: _thing.defaults.inceptBlock,
            inceptTime: _thing.defaults.inceptTime
          } }
          await mq.add(mq.job.fanout.events, _data)
          await mq.add(mq.job.extract.snapshot, _data)
          await mq.add(mq.job.fanout.timeseries, _data)
          await setTimeout(16)
        }
      }
    }
  }
}
