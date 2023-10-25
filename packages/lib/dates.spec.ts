import { expect } from 'chai'
import { endOfDayMs, startOfDayMs } from './dates'

describe('dates', function() {
  it('computes start of day', async function() {
    const start = new Date('2021-01-01T23:59:59.999Z')
    const end = startOfDayMs(start.getTime())
    expect(end).to.deep.eq((new Date('2021-01-01T00:00:00.000Z')).getTime())
  })

  it('computes end of day', async function() {
    const start = new Date('2021-01-01T00:00:00.000Z')
    const end = endOfDayMs(start.getTime())
    expect(end).to.deep.eq((new Date('2021-01-01T23:59:59.999Z')).getTime())
  })
})
