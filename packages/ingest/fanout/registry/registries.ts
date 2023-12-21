import { parseAbi } from 'viem'

export interface Registry {
  chainId: number
  address: `0x${string}`
  version: number
  incept: bigint
  events?: readonly any[]
}

export const contracts: Registry[] = [
  {
    chainId: 1,
    address: '0xe15461b18ee31b7379019dc523231c57d1cbc18c' as `0x${string}`,
    version: 2,
    incept: 11563389n,
    events: parseAbi([
      `event NewExperimentalVault(address indexed token, address indexed deployer, address vault, string api_version)`,
      `event NewVault(address indexed token, uint256 indexed deployment_id, address vault, string api_version)`
    ])
  },
  {
    chainId: 1,
    address: '0x50c1a2eA0a861A967D9d0FFE2AE4012c2E053804' as `0x${string}`,
    version: 2,
    incept: 12045555n,
    events: parseAbi([
      `event NewExperimentalVault(address indexed token, address indexed deployer, address vault, string api_version)`,
      `event NewVault(address indexed token, uint256 indexed vault_id, address vault, string api_version)`
    ])
  },
  {
    chainId: 1,
    address: '0xaF1f5e1c19cB68B30aAD73846eFfDf78a5863319' as `0x${string}`,
    version: 2,
    incept: 16215519n,
    events: parseAbi([
      `event NewVault(address indexed token, uint256 indexed vaultId, uint256 vaultType, address vault, string apiVersion)`
    ])
  },


  {
    chainId: 10,
    address: '0x1ba4eB0F44AB82541E56669e18972b0d6037dfE0' as `0x${string}`,
    version: 2,
    incept: 18097341n,
    events: parseAbi([
      `event NewExperimentalVault(address indexed token, address indexed deployer, address vault, string api_version)`,
      `event NewVault(address indexed token, uint256 indexed vault_id, address vault, string api_version)`
    ])
  },
  {
    chainId: 10,
    address: '0x79286Dd38C9017E5423073bAc11F53357Fc5C128' as `0x${string}`,
    version: 2,
    incept: 22451152n,
    events: parseAbi([
      `event NewVault(address indexed token, uint256 indexed vaultId, uint256 vaultType, address vault, string apiVersion)`
    ])
  },


  {
    chainId: 137,
    address: '0xfF5e3A7C4cBfA9Dd361385c24C3a0A4eE63CE500' as `0x${string}`,
    version: 3,
    incept: 49100596n,
  },


  {
    chainId: 250,
    address: '0x727fe1759430df13655ddb0731dE0D0FDE929b04' as `0x${string}`,
    version: 2,
    incept: 18455565n,
    events: parseAbi([
      `event NewExperimentalVault(address indexed token, address indexed deployer, address vault, string api_version)`,
      `event NewVault(address indexed token, uint256 indexed vault_id, address vault, string api_version)`
    ])
  },


  {
    chainId: 8453,
    address: '0xF3885eDe00171997BFadAa98E01E167B53a78Ec5' as `0x${string}`,
    version: 2,
    incept: 3263730n,
    events: parseAbi([
      `event NewVault(address indexed token, uint256 indexed vaultId, uint256 vaultType, address vault, string apiVersion)`
    ])    
  },


  {
    chainId: 42161,
    address: '0x3199437193625DCcD6F9C9e98BDf93582200Eb1f' as `0x${string}`,
    version: 2,
    incept: 4841854n,
    events: parseAbi([
      `event NewExperimentalVault(address indexed token, address indexed deployer, address vault, string api_version)`,
      `event NewVault(address indexed token, uint256 indexed vault_id, address vault, string api_version)`
    ])
  }
]
