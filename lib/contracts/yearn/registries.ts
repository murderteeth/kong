import * as types from '../../types'
import { parseAbi } from 'viem'

export const contracts = {
  'yearn-registry-0': {
    address: '0xe15461b18ee31b7379019dc523231c57d1cbc18c' as `0x${string}`,
    incept: 11563389n,
    events: parseAbi([
      `event NewVault(address indexed token, uint256 indexed deployment_id, address vault, string api_version)`
    ]),
    parser: {
      NewVault: (log: any) => ({
        address: log.args.vault.toString(),
        apiVersion: log.args.api_version.toString(),
        baseAssetAddress: log.args.token.toString(),
        asOfBlockNumber: log.blockNumber.toString()
      } as types.Vault)
    }
  },

  'yearn-registry-1': {
    address: '0x50c1a2eA0a861A967D9d0FFE2AE4012c2E053804' as `0x${string}`,
    incept: 12045555n,
    events: parseAbi([
      `event NewVault(address indexed token, uint256 indexed vault_id, address vault, string api_version)`
    ]),
    parser: {
      NewVault: (log: any) => ({
        address: log.args.vault.toString(),
        apiVersion: log.args.api_version.toString(),
        baseAssetAddress: log.args.token.toString(),
        asOfBlockNumber: log.blockNumber.toString()
      } as types.Vault)
    }
  },

  'yearn-registry-2': {
    address: '0xaF1f5e1c19cB68B30aAD73846eFfDf78a5863319' as `0x${string}`,
    incept: 16215519n,
    events: parseAbi([
      `event NewVault(address indexed token, uint256 indexed vaultId, uint256 vaultType, address vault, string apiVersion)`
    ]),
    parser: {
      NewVault: (log: any) => ({
        address: log.args.vault.toString(),
        apiVersion: log.args.apiVersion.toString(),
        baseAssetAddress: log.args.token.toString(),
        asOfBlockNumber: log.blockNumber.toString()
      } as types.Vault)
    }
  }
}