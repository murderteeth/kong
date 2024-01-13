import { expect } from 'chai'
import { compute__v2, compute__v3, getHandler, totalDebt } from './harvestApr'
import { types } from 'lib'
import { upsert } from '../load'
import db from '../db'
import { addresses } from '../test.fixture'

const rando = '0x1B243724A773092Df465B20186aF39Ae0A90fC26' as `0x${string}`

const harvest__v3 = {
  chainId: 137,
  address: addresses.v3.aaveV3UsdcLender,
  profit: 0n,
  loss: 0n,
  blockNumber: 51910666n,
  blockTime: 1n,
  blockIndex: 1,
  transactionHash: '0x0000000001'
} as types.Harvest

const harvest__v2 = {
  chainId: 1,
  address: addresses.v2.strategystEthAccumulator_v2,
  profit: 122295812297070635612n,
  loss: 0n,
  totalProfit: 1205071216861557778611n,
  totalLoss: 0n,
  totalDebt: 25247124300383549383601n,
  blockNumber: 17613565n,
  blockTime: 1n,
  blockIndex: 1,
  transactionHash: '0x0000000001'
} as types.Harvest

describe.only('harvest apr', function() {
  it('gets no handler', async function() {
    expect(await getHandler(1, rando)).to.be.undefined
  })

  it('gets v2 handlers', async function() {
    await upsert({ chainId: 1, address: rando }, 'strategy', 'chain_id, address')
    expect((await getHandler(1, rando) || {}).name).to.equal('v2')
    await db.query('DELETE FROM strategy WHERE chain_id = $1 AND address = $2', [1, rando])
  })

  it('gets v3 handlers', async function() {
    await upsert({ chainId: 1, address: rando, type: 'strategy', apiVersion: '3.0.0' }, 'vault', 'chain_id, address')
    expect((await getHandler(1, rando) || {}).name).to.equal('v3')
    await db.query('DELETE FROM vault WHERE chain_id = $1 AND address = $2', [1, rando])
  })

  describe('v3', function() {
    it('extracts totalDebt', async function() {
      const debt = await totalDebt({ chainId: 137, address: addresses.v3.aaveV3UsdcLender, blockNumber: 51413288n } as types.Harvest)
      expect(debt).to.equal(10489089449n)
    })

    it('extracts zero totalDebt', async function() {
      const debt = await totalDebt({ chainId: 137, address: rando, blockNumber: 51413288n } as types.Harvest)
      expect(debt).to.equal(0n)
    })

    it('zeros apr on zero debt', async function() {
      const zeroDebt = {
        ...harvest__v3,
        address: rando
      }
      const apr = await compute__v3(zeroDebt, zeroDebt)
      expect(apr.gross).to.equal(0)
      expect(apr.net).to.equal(0)
    })

    it('computes gross and net apr on profit', async function() {
      const latest = {
        ...harvest__v3,
        profit: 1209748995n,
        performanceFees: 89748995n,
        protocolFees: 29748995n,
        blockNumber: 51916666n,
        blockTime: BigInt(70 * 24 * 60 * 60 + (9 * 60 * 60)),
        transactionHash: '0x0000000002'
      } as types.Harvest

      const apr = await compute__v3(latest, harvest__v3)
      expect(apr.gross).to.equal(0.05179518421103771)
      expect(apr.net).to.equal(0.04795259723804295)
      expect(apr.blockNumber).to.equal(51916666n)
    })
  
    it('computes gross and net apr on loss', async function() {
      const zero = {
        ...harvest__v3,
        profit: 0n,
        loss: 0n
      } as types.Harvest
  
      const loss = {
        ...zero,
        profit: 0n,
        loss: 1209748995n,
        blockNumber: 51916666n,
        blockTime: BigInt(70 * 24 * 60 * 60 + (9 * 60 * 60)),
        transactionHash: '0x0000000002'
      } as types.Harvest
  
      const apr = await compute__v3(loss, zero)
      expect(apr.gross).to.equal(-0.05179518421103771)
      expect(apr.net).to.equal(apr.gross)
      expect(apr.blockNumber).to.equal(51916666n)
    })
  })

  describe('v2', function() {
    it('zeros apr on zero debt', async function() {
      const zeroDebt = {
        ...harvest__v2,
        totalDebt: 0n
      }
      const apr = await compute__v2(zeroDebt, harvest__v2)
      expect(apr.gross).to.equal(0)
      expect(apr.net).to.equal(0)
    })
  
    it('computes gross and net apr on profit', async function() {
      const latest = {
        ...harvest__v2,
        profit: 194459789900456241429n,
        totalProfit: 1399531006762014020040n,
        totalDebt: 33677195107170865265139n,
        blockNumber: 18116044n,
        blockTime: BigInt(70 * 24 * 60 * 60 + (9 * 60 * 60)),
        transactionHash: '0x0000000002'
      } as types.Harvest
  
      const apr = await compute__v2(latest, harvest__v2)
      expect(apr.gross).to.equal(0.039971418235301995)
      expect(apr.net).to.equal(0.0319771345882416)
      expect(apr.blockNumber).to.equal(18116044n)
    })
  
    it('computes gross and net apr on loss', async function() {
      const zero = {
        ...harvest__v2,
        profit: 0n,
        loss: 0n,
        totalProfit: 0n,
        totalDebt: 8311254141901699072n,
        blockNumber: 85700751n
      } as types.Harvest
  
      const loss = {
        ...zero,
        profit: 0n,
        loss: 523277537563798n,
        totalProfit: 0n,
        totalLoss: 523277537563798n,
        totalDebt: 8341915528350199808n,
        blockNumber: 85961102n,
        blockTime: BigInt(24 * 60 * 60),
        transactionHash: '0x0000000002'
      } as types.Harvest
  
      const apr = await compute__v2(loss, zero)
      expect(apr.gross).to.equal(-0.023979592588218704)
      expect(apr.net).to.equal(apr.gross)
      expect(apr.blockNumber).to.equal(85961102n)
    })
  })
})
