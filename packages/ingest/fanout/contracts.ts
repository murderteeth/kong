import { contracts, mq } from 'lib'
import * as things from '../things'

export default class ContractsFanout {
  async fanout(data: any) {
    for (const contract of contracts) {
      for (const source of contract.sources) {
        const _data = { ...data, contract, source }
        await mq.add(mq.job.fanout.events, _data)
        await mq.add(mq.job.extract.snapshot, _data)
      }

      if(contract.things) {
        const _things = await things.get(contract.things)
        for (const _thing of _things) {
          const _data = { ...data, contract, source: { 
            chainId: _thing.chainId, 
            address: _thing.address, 
            inceptBlock: _thing.defaults.inceptBlock 
          } }
          await mq.add(mq.job.fanout.events, _data)
          await mq.add(mq.job.extract.snapshot, _data)
        }
      }
    }
  }
}
