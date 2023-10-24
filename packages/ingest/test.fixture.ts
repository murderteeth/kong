require('lib/json.monketpatch')
import path from 'path'
import dotenv from 'dotenv'
import chai from 'chai'
import chaiAlmost from 'chai-almost'
import { rpcs } from 'lib/rpcs'
import db, { toUpsertSql } from './db'
import { cache, types } from 'lib'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

chai.use(chaiAlmost())

export const mochaGlobalSetup = async function() {
  await rpcs.up()
  await cache.up()
  console.log('⬆', 'test fixture up')
}

export const mochaGlobalTeardown = async () => {
  await db.end()
  await cache.down()
  await rpcs.down()
  console.log('⬇', 'test fixture down')
}

export const addresses = {
  yvusdt: '0x3B27F92C0e212C671EA351827EDF93DB27cc0c65' as `0x${string}`,
  usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as `0x${string}`,
  strategyLenderYieldOptimiser: '0xd8F414beB0aEb5784c5e5eBe32ca9fC182682Ff8' as `0x${string}`,

  yvweth: '0xa258C4606Ca8206D8aA700cE2143D7db854D168c' as `0x${string}`,
  weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`,
  genericLevCompFarmWeth: '0x83B6211379c26E0bA8d01b9EcD4eE1aE915630aa' as `0x${string}`,
  strategystEthAccumulator_v2: '0x120FA5738751b275aed7F7b46B98beB38679e093' as `0x${string}`,
}

export const yvusdtDb = {
  up: async () => {
    const vault = {
      chainId: 1, type: 'vault',
      address: addresses.yvusdt,
      assetAddress: addresses.usdt,
      decimals: 6,
      asOfBlockNumber: 0n
    } as types.Vault
    await db.query(
      toUpsertSql('vault', 'chain_id, address', vault), 
      Object.values(vault)
    )

    const strategy = {
      chainId: 1,
      address: addresses.strategyLenderYieldOptimiser,
      vaultAddress: vault.address,
      asOfBlockNumber: 0n
    } as types.Strategy
    await db.query(
      toUpsertSql('strategy', 'chain_id, address', strategy),
      Object.values(strategy)
    )

    const harvest = {
      chainId: 1,
      address: addresses.strategyLenderYieldOptimiser,
      profit: '0',
      loss: '0',
      totalProfit: '0',
      totalLoss: '0',
      totalDebt: '0',
      blockNumber: '15243268',
      blockTime: '1',
      blockIndex: 1,
      transactionHash: '0x0000000001'
    } as types.Harvest
    await db.query(
      toUpsertSql('harvest', 'chain_id, block_number, block_index', harvest),
      Object.values(harvest)
    )
    await db.query(
      toUpsertSql('harvest', 'chain_id, block_number, block_index', harvest),
      Object.values({
        ...harvest,
        profit: '0',
        totalProfit: '0',
        totalDebt: '0',
        blockNumber: '15243269',
        blockTime: '2',
        transactionHash: '0x0000000002'
      })
    )
  },

  down: async () => {
    await db.query('DELETE FROM harvest WHERE chain_id = $1 AND address = $2', [1, addresses.strategyLenderYieldOptimiser])
    await db.query('DELETE FROM strategy WHERE chain_id = $1 AND vault_address = $2', [1, addresses.yvusdt])
    await db.query('DELETE FROM vault WHERE chain_id = $1 AND address = $2', [1, addresses.yvusdt])
  }
}

export const yvwethDb = {
  up: async () => {
    const vault = {
      chainId: 1, type: 'vault',
      address: addresses.yvweth,
      assetAddress: addresses.weth,
      decimals: 18,
      asOfBlockNumber: 0n
    } as types.Vault
    await db.query(
      toUpsertSql('vault', 'chain_id, address', vault), 
      Object.values(vault)
    )

    const oldStrategy = {
      chainId: 1,
      address: addresses.genericLevCompFarmWeth,
      vaultAddress: vault.address,
      asOfBlockNumber: 0n
    } as types.Strategy
    await db.query(
      toUpsertSql('strategy', 'chain_id, address', oldStrategy),
      Object.values(oldStrategy)
    )

    const strategy = {
      chainId: 1,
      address: addresses.strategystEthAccumulator_v2,
      vaultAddress: vault.address,
      asOfBlockNumber: 0n
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
      blockTime: '1',
      blockIndex: 1,
      transactionHash: '0x0000000001'
    } as types.Harvest
    await db.query(
      toUpsertSql('harvest', 'chain_id, block_number, block_index', harvest),
      Object.values(harvest)
    )
    await db.query(
      toUpsertSql('harvest', 'chain_id, block_number, block_index', harvest),
      Object.values({
        ...harvest,
        profit: '194459789900456241429',
        totalProfit: '1399531006762014020040',
        totalDebt: '33677195107170865265139',
        blockNumber: '18116044',
        blockTime: (70 * 24 * 60 * 60 + (9 * 60 * 60)).toString(),
        transactionHash: '0x0000000002'
      })
    )
  },

  down: async () => {
    await db.query('DELETE FROM apr WHERE chain_id = $1 AND address = $2', [1, addresses.strategystEthAccumulator_v2])
    await db.query('DELETE FROM harvest WHERE chain_id = $1 AND address = $2', [1, addresses.strategystEthAccumulator_v2])
    await db.query('DELETE FROM strategy WHERE chain_id = $1 AND vault_address = $2', [1, addresses.yvweth])
    await db.query('DELETE FROM vault WHERE chain_id = $1 AND address = $2', [1, addresses.yvweth])
  }
}

export function withYvWethDb(fn: (this: any) => Promise<void>) {
  return async function(this: any) {
    try {
      await yvwethDb.up()
    } catch(e) {
      console.error(e)
      throw e
    }

    try {
      await fn.call(this)
    } finally {
      await yvwethDb.down()
    }
  }
}

export function withYvUsdtDb(fn: (this: any) => Promise<void>) {
  return async function(this: any) {
    try {
      await yvusdtDb.up()
    } catch(e) {
      console.error(e)
      throw e
    }

    try {
      await fn.call(this)
    } finally {
      await yvusdtDb.down()
    }
  }
}
