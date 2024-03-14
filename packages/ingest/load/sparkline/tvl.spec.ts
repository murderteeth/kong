// import { expect } from 'chai'
// import { addresses, withYvWethDb } from '../../test.fixture'
// import loader from './tvl'
// import db, { getSparkline, toUpsertSql } from '../../db'
// import { mainnet } from 'viem/chains'
// import { types } from 'lib'

// describe('loader sparkline tvl', function() {
//   before(async function() { 
//     this.data = { chainId: mainnet.id, address: addresses.v2.yvweth }
//   })

//   afterEach(async function() {
//     await db.query(
//       `DELETE FROM sparkline WHERE chain_id = $1 AND address = $2 AND type = 'vault-tvl-7d'`, 
//       Object.values(this.data)
//     )
//   })

//   it('does nada wen no data', async function() {
//     await loader(this.data)
//     const result = await getSparkline(this.data.chainId, this.data.address, 'vault-tvl-7d')
//     expect(result.length).to.equal(0)
//   })

//   it('loads partial sparklines', withYvWethDb(async function(this: Mocha.Context) {
//     const tvl = {
//       chainId: mainnet.id,
//       address: addresses.v2.yvweth,
//       tvlUsd: 100,
//       blockNumber: 1n,
//       blockTime: 1n
//     } as types.TVL

//     await db.query(
//       toUpsertSql('tvl', 'chain_id, address, block_time', tvl),
//       Object.values(tvl)
//     )

//     await loader(this.data)
//     const result = await getSparkline(this.data.chainId, this.data.address, 'vault-tvl-7d')
//     expect(result.length).to.equal(1)
//     expect(result[0].value).to.equal(100)
//   }))

//   it('loads sparkline', withYvWethDb(async function(this: Mocha.Context) {
//     const tvl = {
//       chainId: mainnet.id,
//       address: addresses.v2.yvweth,
//       tvlUsd: 100,
//       blockNumber: 1n,
//       blockTime: 1n
//     } as types.TVL

//     await db.query(
//       toUpsertSql('tvl', 'chain_id, address, block_time', tvl),
//       Object.values(tvl)
//     )

//     await db.query(
//       toUpsertSql('tvl', 'chain_id, address, block_time', tvl),
//       Object.values({...tvl, blockNumber: '2', blockTime: 1 * (60 * 60 * 24 * 7) + ''})
//     )

//     await db.query(
//       toUpsertSql('tvl', 'chain_id, address, block_time', tvl),
//       Object.values({...tvl, blockNumber: '3', blockTime: 2 * (60 * 60 * 24 * 7) + ''})
//     )

//     await db.query(
//       toUpsertSql('tvl', 'chain_id, address, block_time', tvl),
//       Object.values({...tvl, tvlUsd: 200, blockNumber: '4', blockTime: 3 * (60 * 60 * 24 * 7) + ''})
//     )

//     await loader(this.data)
//     const result = await getSparkline(this.data.chainId, this.data.address, 'vault-tvl-7d')
//     expect(result.length).to.equal(3)
//     expect(result[0].value).to.equal(100)
//     expect(result[1].value).to.equal(100)
//     expect(result[2].value).to.equal(200)
//   }))
// })