import { expect } from 'chai'
import HarvestAprFanout from './harvestApr'
import { mq } from 'lib'
import { withYvWethDb } from '../test.fixture'

describe('harvest apr fanout', function() {
  it('finds harvests missing aprs', withYvWethDb(async function(this: Mocha.Context) {
    const q = mq.queue(mq.q.compute)
    const fanout = new HarvestAprFanout()
    await fanout.up()
    try {

      expect(await q.count()).to.equal(0)
      await fanout.do()
      expect(await q.count()).to.equal(1)

    } finally {
      await fanout.down()
      await q.close()
    }
  }))
})
