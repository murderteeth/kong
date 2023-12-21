import { expect } from 'chai'
import { _compute } from './harvestApr'
import { types } from 'lib'
import { addresses } from '../test.fixture'

const profitable = {
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

describe('harvest apr', function() {
  it('zeros on zero debt', async function() {
    const zeroDebt = {
      ...profitable,
      totalDebt: 0n
    }
    const apr = await _compute(zeroDebt, profitable)
    expect(apr.gross).to.equal(0)
    expect(apr.net).to.equal(0)
  })

  it('computes gross and net on profit', async function() {
    const latest = {
      ...profitable,
      profit: 194459789900456241429n,
      totalProfit: 1399531006762014020040n,
      totalDebt: 33677195107170865265139n,
      blockNumber: 18116044n,
      blockTime: BigInt(70 * 24 * 60 * 60 + (9 * 60 * 60)),
      transactionHash: '0x0000000002'
    } as types.Harvest

    const apr = await _compute(latest, profitable)
    expect(apr.gross).to.equal(0.039971418235301995)
    expect(apr.net).to.equal(0.0319771345882416)
    expect(apr.blockNumber).to.equal(18116044n)
  })

  it('computes gross and net on loss', async function() {
    const zero = {
      ...profitable,
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

    const apr = await _compute(loss, zero)
    expect(apr.gross).to.equal(-0.023979592588218704)
    expect(apr.net).to.equal(apr.gross)
    expect(apr.blockNumber).to.equal(85961102n)
  })
})
