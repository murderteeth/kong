import { expect } from 'chai'
import { addresses } from '../../../../../test.fixture'
import { extractDebts, extractUnlock } from './hook'

describe('abis/yearn/3/vault/snapshot/hook', function() {
  it('extracts unlock', async function() {
    const result = await extractUnlock(137, addresses.v3.yvusdca, 54_800_000n)
    expect(result).to.be.deep.eq({ 
      unlockedShares: 1938274333n, 
      unlockedAssets: 2076188038n 
    })
  })
})
