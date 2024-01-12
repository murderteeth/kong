import { expect } from 'chai'
import { polygon, mainnet } from 'viem/chains'
import { types } from 'lib'
import { firstRow } from '../db'
import { addresses } from '../test.fixture'
import { upsertAsOfBlock } from '.'

describe('load', function() {
  it('upserts updates as of block number', async function() {
    const vault = {
      chainId: polygon.id, type: 'vault', address: addresses.v3.yvusdca, 
      __as_of_block: 1n, name: '1'
    } as types.Vault

    await upsertAsOfBlock(vault, 'vault', ['chain_id', 'address'])

    let { name } = await firstRow(`SELECT name FROM vault WHERE chain_id = $1 AND address = $2`, [polygon.id, addresses.v3.yvusdca])
    expect(name).to.eq('1')

    vault.name = '2'
    vault.__as_of_block = 2n
    await upsertAsOfBlock(vault, 'vault', ['chain_id', 'address'])

    ;({ name } = await firstRow(`SELECT name FROM vault WHERE chain_id = $1 AND address = $2`, [polygon.id, addresses.v3.yvusdca]))
    expect(name).to.eq('2')

    vault.name = '3'
    vault.__as_of_block = 1n
    await upsertAsOfBlock(vault, 'vault', ['chain_id', 'address'])

    ;({ name } = await firstRow(`SELECT name FROM vault WHERE chain_id = $1 AND address = $2`, [polygon.id, addresses.v3.yvusdca]))
    expect(name).to.eq('2')
  })
})
