import { expect } from 'chai'
import { Contract, ContractSchema, prune } from './contracts'
import { z } from 'zod'

describe('contracts', function() {
  it('prunes nothing', async function() {
    const contracts: Contract[] = mock()
    expect(prune(contracts)).to.deep.equal(contracts)
  })

  it('prunes contracts', async function() {
    const contracts = mock()
    contracts[0].skip = true
    expect(prune(contracts)).to.deep.equal(contracts.slice(1))

    contracts[0].skip = false
    contracts[0].only = true
    expect(prune(contracts)).to.deep.equal([{...contracts[0], skip: false, only: true}])
  })

  it('prunes sources', async function() {
    const contracts = mock()
    contracts[0].sources[0].skip = true
    let pruned = prune(contracts)
    expect(pruned.length).to.equal(3)
    expect(pruned[0].sources.length).to.equal(1)

    contracts[0].sources[0].skip = false
    contracts[0].sources[0].only = true
    pruned = prune(contracts)
    expect(pruned.length).to.equal(1)
    expect(pruned[0].sources.length).to.equal(1)
    expect(pruned[0].abiPath).to.equal('a')
  })

  it('prunes things', async function() {
    const contracts = mock()
    contracts[2].things!.skip = true
    let pruned = prune(contracts)
    expect(pruned).to.deep.equal(contracts.slice(0, 2))

    contracts[2].things!.skip = false
    contracts[2].things!.only = true
    pruned = prune(contracts)
    expect(pruned.length).to.equal(1)
    expect(pruned[0].sources.length).to.equal(0)
    expect(pruned[0].abiPath).to.equal('c')
    expect(pruned[0].things?.label).to.equal('c')
  })

  it('prunes contracts and sources', async function() {
    const contracts = mock()
    contracts[0].sources[0].only = true
    contracts[1].only = true
    const pruned = prune(contracts)
    expect(pruned.length).to.equal(2)
  })
})

function mock() {
  return ContractSchema.array().parse([
    {
      abiPath: 'a', schedule: 'a',
      sources: [
        { chainId: 1, address: '0x', inceptBlock: 1n },
        { chainId: 2, address: '0x', inceptBlock: 1n }
      ],
      things: undefined
    },
    {
      abiPath: 'b', schedule: 'b',
      sources: [
        { chainId: 1, address: '0x', inceptBlock: 1n }
      ],
      things: undefined
    },
    {
      abiPath: 'c', schedule: 'c',
      sources: [],
      things: { label: 'c', filter: [] }
    }
  ])
}
