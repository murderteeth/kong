import { expect } from 'chai'
import { mainnet } from 'viem/chains'
import { extractLenderStatuses } from './strategy'

describe('strategy', function() {
  it('extracts some lender statuses', async function() {
    const statuses = await extractLenderStatuses(mainnet.id, '0x2216E44fA633ABd2540dB72Ad34b42C7F1557cd4', 18530014n)
    expect(statuses).to.be.an('array')
    expect(statuses).to.have.length(2)
    expect(statuses[1]).to.deep.equal({
      chainId: 1,
      strategyAddress: '0x2216E44fA633ABd2540dB72Ad34b42C7F1557cd4',
      name: 'GenericCompV3',
      assets: 1125403759558n,
      rate: 63939160081334480n,
      address: '0x2eD5eAf929Fee1F5F9B32d83dB8ed06b52692A74',
      asOfBlockNumber: 18530014n
    })
  })

  it('extracts no lender statuses', async function() {
    const statuses = await extractLenderStatuses(mainnet.id, '0x120FA5738751b275aed7F7b46B98beB38679e093', 18530014n)
    expect(statuses).to.be.an('array')
    expect(statuses).to.have.length(0)
  })
})
