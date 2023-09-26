import { expect } from 'chai'
import { mainnet } from 'viem/chains'
import { getAsset } from './harvest'
import { addresses, useYvWethDb } from '../../../test.fixture'

describe('harvest', function() {
  it('gets asset for strategy via chain', async function() {
    const asset = await getAsset(mainnet.id, addresses.genericLevCompFarmWeth)
    expect(asset?.address).to.equal(addresses.weth)
    expect(asset?.decimals).to.equal(18)
    expect(asset?.source).to.equal('rpc')
  })

  it('gets asset for strategy via db', useYvWethDb(async function() {
    const asset = await getAsset(mainnet.id, addresses.genericLevCompFarmWeth)
    expect(asset?.address).to.equal(addresses.weth)
    expect(asset?.decimals).to.equal(18)
    expect(asset?.source).to.equal('db')
  }))
})
