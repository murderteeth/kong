import path from 'path'
import dotenv from 'dotenv'
import { rpcs } from 'lib/rpcs'
import db, { toUpsertSql } from './db'
import { types } from 'lib'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

export const mochaGlobalSetup = async function() {
  await rpcs.up()
  console.log('⬆', 'rpcs up')
}

export const mochaGlobalTeardown = async () => {
  await db.end()
  console.log('⬇', 'db down')
  await rpcs.down()
  console.log('⬇', 'rpcs down')
}

export const addresses = {
  yvweth: '0xa258C4606Ca8206D8aA700cE2143D7db854D168c' as `0x${string}`,
  weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`,
  genericLevCompFarmWeth: '0x83B6211379c26E0bA8d01b9EcD4eE1aE915630aa' as `0x${string}`,
  strategystEthAccumulator_v2: '0x120FA5738751b275aed7F7b46B98beB38679e093' as `0x${string}`,
}

export const yvwethDb = {
  up: async () => {
    const vault = {
      chainId: 1, type: 'vault',
      address: addresses.yvweth,
      assetAddress: addresses.weth,
      decimals: 18,
      asOfBlockNumber: '0'
    } as types.Vault
    await db.query(
      toUpsertSql('vault', 'chain_id, address', vault), 
      Object.values(vault)
    )

    const oldStrategy = {
      chainId: 1,
      address: addresses.genericLevCompFarmWeth,
      vaultAddress: vault.address,
      asOfBlockNumber: '0'
    } as types.Strategy
    await db.query(
      toUpsertSql('strategy', 'chain_id, address', oldStrategy),
      Object.values(oldStrategy)
    )

    const strategy = {
      chainId: 1,
      address: addresses.strategystEthAccumulator_v2,
      vaultAddress: vault.address,
      asOfBlockNumber: '0'
    } as types.Strategy
    await db.query(
      toUpsertSql('strategy', 'chain_id, address', strategy),
      Object.values(strategy)
    )

    const harvest = {
      chainId: 1,
      address: addresses.strategystEthAccumulator_v2,
      profit: '122295812297070635612',
      loss: '0',
      totalProfit: '1205071216861557778611',
      totalLoss: '0',
      totalDebt: '25247124300383549383601',
      blockNumber: '17613565',
      blockTimestamp: '1',
      blockIndex: 1,
      transactionHash: '0x0000000001'
    } as types.Harvest
    await db.query(
      toUpsertSql('harvest', 'chain_id, block_number, block_index', harvest),
      Object.values(harvest)
    )
  },

  down: async () => {
    await db.query('DELETE FROM harvest WHERE chain_id = $1 AND address = $2', [1, addresses.strategystEthAccumulator_v2])
    await db.query('DELETE FROM strategy WHERE chain_id = $1 AND vault_address = $2', [1, addresses.yvweth])
    await db.query('DELETE FROM vault WHERE chain_id = $1 AND address = $2', [1, addresses.yvweth])
  }
}

export function useYvWethDb(fn: (this: any) => Promise<void>) {
  return async function(this: any) {
    await yvwethDb.up()
    try {
      await fn.call(this)
    } finally {
      await yvwethDb.down()
    }
  }
}
