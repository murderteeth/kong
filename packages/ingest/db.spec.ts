import { expect } from 'chai'
import { polygon, mainnet } from 'viem/chains'
import { addresses } from './test.fixture'
import { types } from 'lib'
import db, { getApiVersion, toUpsertSql } from './db'

describe('db', function() {
  it('gets v2 vault api version', async function() {
    const vault = {
      chainId: mainnet.id, address: addresses.v2.yvweth,
      apiVersion: '0.4.2'
    } as types.Vault
    await db.query(toUpsertSql('vault', 'chain_id, address', vault), Object.values(vault))

    const apiVersion = await getApiVersion(vault)
    expect(apiVersion).to.equal('0.4.2')
  })

  it('gets v2 strategy api version', async function() {
    const strategy = {
      chainId: mainnet.id, address: addresses.v2.strategyLenderYieldOptimiser,
      apiVersion: '0.3.2'
    } as types.Vault
    await db.query(toUpsertSql('strategy', 'chain_id, address', strategy), Object.values(strategy))

    const apiVersion = await getApiVersion(strategy)
    expect(apiVersion).to.equal('0.3.2')
  })

  it('gets v3 vault api version', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.yvusdca,
      type: 'vault', apiVersion: '3.0.1'
    } as types.Vault
    await db.query(toUpsertSql('vault', 'chain_id, address', vault), Object.values(vault))

    const apiVersion = await getApiVersion(vault)
    expect(apiVersion).to.equal('3.0.1')
  })

  it('gets v3 strategy api version', async function() {
    const strategy = {
      chainId: polygon.id, address: addresses.v3.aaveV3UsdcLender,
      type: 'strategy', apiVersion: '3.0.1'
    } as types.Vault
    await db.query(toUpsertSql('vault', 'chain_id, address', strategy), Object.values(strategy))

    const apiVersion = await getApiVersion(strategy)
    expect(apiVersion).to.equal('3.0.1')
  })
})
