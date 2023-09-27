import { expect } from 'chai'
import HarvestAprPoller from './harvestApr'
import { mq } from 'lib'
import { useYvWethDb } from '../test.fixture'

describe('harvest apr poller', function() {
  it('finds harvests missing aprs', useYvWethDb(async function(this: Mocha.Context) {
    const q = mq.queue(mq.q.compute)
    const poller = new HarvestAprPoller()
    await poller.up()
    try {

      expect(await q.count()).to.equal(0)
      await poller.do()
      expect(await q.count()).to.equal(1)

    } finally {
      await poller.down()
      await q.close()
    }
  }))
})
