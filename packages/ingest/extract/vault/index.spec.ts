import { expect } from 'chai'
import { polygon } from 'viem/chains'
import { addresses } from '../../test.fixture'
import { types } from 'lib'
import { extractApiVersion } from '.'

describe('vault', function() {
  this.timeout(10_000)

  it('extracts api version', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.yvusdca
    } as types.Vault

    const apiVersion = await extractApiVersion(vault, 51413288n)
    expect(apiVersion).to.equal('3.0.1')
  })
})
