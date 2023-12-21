import { expect } from 'chai'
import { polygon } from 'viem/chains'
import { addresses } from '../../test.fixture'
import { types } from 'lib'
import db, { toUpsertSql } from '../../db'
import { extractApiVersion, getApiVersion } from '.'

describe.only('vault', function() {
  it('extracts api version', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.yvusdca, asOfBlockNumber: 0n
    } as types.Vault

    const apiVersion = await extractApiVersion(vault)
    expect(apiVersion).to.equal('3.0.1')
  })

  it('gets api version from db', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.yvusdca, asOfBlockNumber: 0n,
      apiVersion: '3.0.1'
    } as types.Vault
    await db.query(toUpsertSql('vault', 'chain_id, address', vault), Object.values(vault))

    const apiVersion = await getApiVersion(vault)
    expect(apiVersion).to.equal('3.0.1')
  })
})
