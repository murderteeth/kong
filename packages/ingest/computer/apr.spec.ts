import { expect } from 'chai'
import { addresses, useYvWethDb, yvwethDb } from '../test.fixture'
import { compute } from './apr'
import { types } from 'lib'

describe('apr', function() {
  const latestHarvest = {
    chainId: 1,
    address: addresses.strategystEthAccumulator_v2,
    profit: '194459789900456241429',
    loss: '0',
    totalProfit: '1399531006762014020040',
    totalLoss: '0',
    totalDebt: '33677195107170865265139',
    blockNumber: '18116044',
    blockTimestamp: (70 * 24 * 60 * 60 + (9 * 60 * 60)).toString(),
    blockIndex: 1,
    transactionHash: '0x0000000001'
  } as types.Harvest

  it('zeros on no previous data', async function() {
    const apr = await compute(latestHarvest)
    expect(apr.gross).to.equal(0.0)
    expect(apr.net).to.equal(0.0)
  })

  it('computes gross and net', useYvWethDb(async function(this: Mocha.Context) {
    const apr = await compute(latestHarvest)
    expect(apr.gross).to.equal(0.029964597156398102)
    expect(apr.net).to.equal(0.029964597156398102)
  }))
})
