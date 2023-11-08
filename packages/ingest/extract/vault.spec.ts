import { expect } from 'chai'
import { mainnet } from 'viem/chains'
import { addresses } from '../test.fixture'
import { extractWithdrawalQueue } from './vault'

describe('vault', function() {
  it('extracts withdrawal queue', async function() {
    const q = await extractWithdrawalQueue(mainnet.id, addresses.yvweth, 18530014n)
    expect(q).to.be.an('array')
    expect(q.length).to.be.eq(3)
    expect(q[0]).to.be.eq('0xec2DB4A1Ad431CC3b102059FA91Ba643620F0826')
    expect(q[1]).to.be.eq('0x120FA5738751b275aed7F7b46B98beB38679e093')
    expect(q[2]).to.be.eq('0x64E4779BfF8588ccDCa9f290b9Bc346a798f5277')
  })
})
