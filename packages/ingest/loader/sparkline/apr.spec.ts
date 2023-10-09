import { expect } from 'chai'
import { addresses, withYvWethDb } from '../../test.fixture'
import loader from './apr'
import db, { getSparkline, toUpsertSql } from '../../db'
import { mainnet } from 'viem/chains'
import { types } from 'lib'

describe('loader sparkline tvl', function() {
  before(async function() { 
    this.data = { chainId: mainnet.id, address: addresses.strategystEthAccumulator_v2 }
  })

  afterEach(async function() {
    await db.query(
      `DELETE FROM sparkline WHERE chain_id = $1 AND address = $2 AND type = 'strategy-apr-7d'`,
      Object.values(this.data)
    )
  })

  it('does nada wen no data', async function() {
    await loader(this.data)
    const result = await getSparkline(this.data.chainId, this.data.address, 'strategy-apr-7d')
    expect(result.length).to.equal(0)
  })

  it('loads partial sparklines', withYvWethDb(async function(this: Mocha.Context) {
    const apr = {
      chainId: mainnet.id,
      address: addresses.strategystEthAccumulator_v2,
      gross: 0,
      net: 0.1,
      blockNumber: '1',
      blockTime: '1'
    } as types.APR

    await db.query(
      toUpsertSql('apr', 'chain_id, address, block_time', apr),
      Object.values(apr)
    )

    await loader(this.data)
    const result = await getSparkline(this.data.chainId, this.data.address, 'strategy-apr-7d')
    expect(result.length).to.equal(1)
    expect(result[0].value).to.equal(apr.net)
  }))

  it('loads sparkline', withYvWethDb(async function(this: Mocha.Context) {
    const apr = {
      chainId: mainnet.id,
      address: addresses.strategystEthAccumulator_v2,
      gross: 0,
      net: 0.1,
      blockNumber: '1',
      blockTime: '1'
    } as types.APR

    await db.query(
      toUpsertSql('apr', 'chain_id, address, block_time', apr),
      Object.values(apr)
    )

    await db.query(
      toUpsertSql('apr', 'chain_id, address, block_time', apr),
      Object.values({...apr, blockNumber: '2', blockTime: 1 * (60 * 60 * 24 * 7) + ''})
    )

    await db.query(
      toUpsertSql('apr', 'chain_id, address, block_time', apr),
      Object.values({...apr, blockNumber: '3', blockTime: 2 * (60 * 60 * 24 * 7) + ''})
    )

    await db.query(
      toUpsertSql('apr', 'chain_id, address, block_time', apr),
      Object.values({...apr, net: 0.2, blockNumber: '4', blockTime: 3 * (60 * 60 * 24 * 7) + ''})
    )

    await loader(this.data)
    const result = await getSparkline(this.data.chainId, this.data.address, 'strategy-apr-7d')
    expect(result.length).to.equal(3)
    expect(result[0].value).to.equal(0.1)
    expect(result[1].value).to.equal(0.1)
    expect(result[2].value).to.equal(0.2)
  }))
})