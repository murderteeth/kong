import { expect } from 'chai'
import { HarvestSchema, computeApr } from './hook'
import { addresses } from '../../../../../../test.fixture'

function mock() {
  return HarvestSchema.parse({
    chainId: 1,
    address: addresses.v2.yvweth,
    blockNumber: 17613565n,
    blockTime: 1n,
    args: {
      strategy: addresses.v2.strategystEthAccumulator_v2,
      gain: 122295812297070635612n,
      loss: 0n,
      debtPaid: 0n,
      totalGain: 1205071216861557778611n,
      totalLoss: 0n,
      totalDebt: 25247124300383549383601n,
      debtAdded: 0n,
      debtRatio: 0n,
    }
  })
}

describe('abis/yearn/2/vault/event/strategyReported/hook', function() {
  it('zeros apr on zero debt', async function() {
    const zeroDebt = {...mock(), args: { ...mock().args, totalDebt: 0n } }
    const apr = await computeApr(zeroDebt, mock())
    expect(apr.gross).to.equal(0)
    expect(apr.net).to.equal(0)
  })

  it('computes gross and net apr on profit', async function() {
    const latest = { 
      ...mock(),
      blockNumber: 18116044n,
      blockTime: BigInt(70 * 24 * 60 * 60 + (9 * 60 * 60)),
      args: { ...mock().args,
        gain: 194459789900456241429n,
        totalGain: 1399531006762014020040n,
        totalDebt: 33677195107170865265139n,    
      } 
    }

    const apr = await computeApr(latest, mock())
    expect(apr.gross).to.equal(0.039971418235301995)
    expect(apr.net).to.equal(0.0319771345882416)
  })

  it('computes gross and net apr on loss', async function() {
    const zero = { 
      ...mock(),
      blockNumber: 85700751n,
      args: { ...mock().args,
        gain: 0n,
        loss: 0n,
        totalGain: 0n,
        totalDebt: 8311254141901699072n,    
      } 
    }

    const loss = { 
      ...zero,
      blockNumber: 85961102n,
      blockTime: BigInt(24 * 60 * 60),
      args: { ...mock().args,
        gain: 0n,
        loss: 523277537563798n,
        totalGain: 0n,
        totalLoss: 523277537563798n,
        totalDebt: 8341915528350199808n,    
      } 
    }

    const apr = await computeApr(loss, zero)
    expect(apr.gross).to.equal(-0.023979592588218704)
    expect(apr.net).to.equal(apr.gross)
  })
})
