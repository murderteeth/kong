import { multicall3, types } from 'lib'
import { parseAbi } from 'viem'
import { Processor } from 'lib/processor'
import { rpcs } from '../../rpcs'
import { getApiVersion } from '../../db'
import { compare } from 'compare-versions'
import { VaultExtractor__v3 } from './version3'
import { VaultExtractor__v2 } from './version2'

export class VaultExtractor implements Processor {
  extractors = [
    { version: '3.0.0', extractor: new VaultExtractor__v3() },
    { version: '0.2.0', extractor: new VaultExtractor__v2() }
  ]

  async up() {
    await Promise.all(this.extractors.map(e => e.extractor.up()))
  }

  async down() {
    await Promise.all(this.extractors.map(e => e.extractor.down()))
  }

  async extract(data: any) {
    const vault = data as types.Vault
    const asOfBlockNumber = await rpcs.next(vault.chainId).getBlockNumber()

    if(!multicall3.supportsBlock(vault.chainId, asOfBlockNumber)) {
      console.warn('🚨', 'block not supported', vault.chainId, asOfBlockNumber)
      return
    }

    vault.apiVersion = await getApiVersion(vault) ?? await extractApiVersion(vault)

    let extracted = false
    for(const extractor of this.extractors) {
      if(compare(vault.apiVersion, extractor.version, '>=')) {
        await extractor.extractor.extract(vault, asOfBlockNumber)
        extracted = true
        break
      }
    }

    if(!extracted) throw new Error(`api version ${vault.apiVersion} couldn't be extracted`)
  }
}

export async function extractApiVersion(vault: types.Vault, blockNumber?: bigint) {
  const multicallResult = await rpcs.next(vault.chainId, blockNumber).multicall({ contracts: [
    {
      address: vault.address, functionName: 'apiVersion',
      abi: parseAbi(['function apiVersion() returns (string)'])
    },
    {
      address: vault.address, functionName: 'api_version',
      abi: parseAbi(['function api_version() returns (string)'])
    }
  ], blockNumber })

  if(multicallResult[0].status === 'success') return multicallResult[0].result as string
  if(multicallResult[1].status === 'success') return multicallResult[1].result as string
  throw new Error('!apiVersion')
}
