require('lib/json.monkeypatch')
import { expect } from 'chai'

describe('json monketpatch', function() {
  const _json = { 
    test_0: 1_000_000n,
    test_1: 1_000_000,
    test_2: 'normal string',
    test_3: 'string ending with n'
  }
  const _string = '{"test_0":"1000000n","test_1":1000000,"test_2":"normal string","test_3":"string ending with n"}'

  it('serializes', async function() {
    expect(JSON.stringify(_json)).to.eq(_string)
  })

  it('deserializes', async function() {
    expect(JSON.parse(_string)).to.deep.eq(_json)
  })
})
