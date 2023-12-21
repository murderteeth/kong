import { expect } from 'chai'
import { polygon } from 'viem/chains'
import { addresses } from '../../test.fixture'
import { extractRegistration, getRegistration } from './version3'
import { types } from 'lib'
import db, { toUpsertSql } from '../../db'

describe.only('vaults v3', function() {
  it('extracts registrations', async function() {
    const vault = {
      chainId: polygon.id, registryAddress: addresses.v3.registry, address: addresses.v3.yvusdca, asOfBlockNumber: 0n
    } as types.Vault

    const registration = await extractRegistration(vault)
    expect(registration.type).to.equal('vault')
    expect(registration.activationBlockNumber).to.equal(49181585n)
    expect(registration.activationBlockTime).to.equal(1698338748n)
  })

  it('gets registrations from db', async function() {
    const vault = {
      chainId: polygon.id, registryAddress: addresses.v3.registry, address: addresses.v3.yvusdca, asOfBlockNumber: 0n,
      type: 'vault', activationBlockNumber: 49181585n, activationBlockTime: 1698338748n
    } as types.Vault
    await db.query(toUpsertSql('vault', 'chain_id, address', vault), Object.values(vault))

    const registration = await getRegistration(vault)
    expect(registration?.type).to.equal('vault')
    expect(registration?.activationBlockNumber).to.equal(49181585n)
    expect(registration?.activationBlockTime).to.equal(1698338748n)
  })
})
