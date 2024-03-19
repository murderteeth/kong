import { expect } from 'chai'
import { addresses } from '../../../../../test.fixture'
import { extractDebts, extractUnlock } from './hook'

describe('abis/yearn/2/vault/snapshot/hook', function() {
  it('extracts unlock', async function() {
    const result = await extractUnlock(1, addresses.v2.yvweth, 19_000_100n)
    expect(result).to.be.deep.eq({
      unlockedAssets: 16278137769n 
    })
  })
})
