require('lib/json.monkeypatch')
import path from 'path'
import dotenv from 'dotenv'
import chai from 'chai'
import chaiAlmost from 'chai-almost'
import { rpcs } from './rpcs'
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
  v2: {
    yvusdt: '0x3B27F92C0e212C671EA351827EDF93DB27cc0c65' as `0x${string}`,
    usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7' as `0x${string}`,
    strategyLenderYieldOptimiser: '0xd8F414beB0aEb5784c5e5eBe32ca9fC182682Ff8' as `0x${string}`,
  
    yvweth: '0xa258C4606Ca8206D8aA700cE2143D7db854D168c' as `0x${string}`,
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`,
    genericLevCompFarmWeth: '0x83B6211379c26E0bA8d01b9EcD4eE1aE915630aa' as `0x${string}`,
    strategystEthAccumulator_v2: '0x120FA5738751b275aed7F7b46B98beB38679e093' as `0x${string}`,
  },

  v3: {
    registry: '0xfF5e3A7C4cBfA9Dd361385c24C3a0A4eE63CE500' as `0x${string}`,
    yvusdca: '0xA013Fbd4b711f9ded6fB09C1c0d358E2FbC2EAA0' as `0x${string}`,
    yvusdca_debtManager: '0x62833b804624452F165272D183193f7D0Df97ab3' as `0x${string}`,
    usdc: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' as `0x${string}`,
    aaveV3UsdcLender: '0xdB92B89Ca415c0dab40Dc96E99Fc411C08F20780' as `0x${string}`,
    compoundV3UsdcLender: '0xb1403908F772E4374BB151F7C67E88761a0Eb4f1' as `0x${string}`,
    stargateUsdcStaker: '0x8BBa7AFd0f9B1b664C161EC31d812a8Ec15f7e1a' as `0x${string}`
  }
}

export const yvusdtDb = {
  up: async () => {
    const vault = {
      chainId: 1, type: 'vault',
      address: addresses.v2.yvusdt,
      assetAddress: addresses.v2.usdt,
      decimals: 6,
      asOfBlockNumber: 0n
    } as types.Vault
    await db.query(
      toUpsertSql('vault', 'chain_id, address', vault), 
      Object.values(vault)
    )

    const strategy = {
      chainId: 1,
      address: addresses.v2.strategyLenderYieldOptimiser,
      vaultAddress: vault.address,
      asOfBlockNumber: 0n
    } as types.Strategy
    await db.query(
      toUpsertSql('strategy', 'chain_id, address', strategy),
      Object.values(strategy)
    )

    const harvest = {
      chainId: 1,
      address: addresses.v2.strategyLenderYieldOptimiser,
      profit: 0n,
      loss: 0n,
      totalProfit: 0n,
      totalLoss: 0n,
      totalDebt: 0n,
      blockNumber: 15243268n,
      blockTime: 1n,
      blockIndex: 1,
      transactionHash: '0x0000000001'
    } as types.Harvest
    await db.query(
      toUpsertSql('harvest', 'chain_id, block_number, block_index, address', harvest),
      Object.values(harvest)
    )
    await db.query(
      toUpsertSql('harvest', 'chain_id, block_number, block_index, address', harvest),
      Object.values({
        ...harvest,
        profit: 0n,
        totalProfit: 0n,
        totalDebt: 0n,
        blockNumber: 15243269n,
        blockTime: 2n,
        transactionHash: '0x0000000002'
      })
    )
  },

  down: async () => {
    await db.query('DELETE FROM harvest WHERE chain_id = $1 AND address = $2', [1, addresses.v2.strategyLenderYieldOptimiser])
    await db.query('DELETE FROM strategy WHERE chain_id = $1 AND vault_address = $2', [1, addresses.v2.yvusdt])
    await db.query('DELETE FROM vault WHERE chain_id = $1 AND address = $2', [1, addresses.v2.yvusdt])
  }
}

export const yvwethDb = {
  up: async () => {
    const vault = {
      chainId: 1, type: 'vault',
      address: addresses.v2.yvweth,
      assetAddress: addresses.v2.weth,
      decimals: 18,
      asOfBlockNumber: 0n
    } as types.Vault
    await db.query(
      toUpsertSql('vault', 'chain_id, address', vault), 
      Object.values(vault)
    )

    const oldStrategy = {
      chainId: 1,
      address: addresses.v2.genericLevCompFarmWeth,
      vaultAddress: vault.address,
      asOfBlockNumber: 0n
    } as types.Strategy
    await db.query(
      toUpsertSql('strategy', 'chain_id, address', oldStrategy),
      Object.values(oldStrategy)
    )

    const strategy = {
      chainId: 1,
      address: addresses.v2.strategystEthAccumulator_v2,
      vaultAddress: vault.address,
      asOfBlockNumber: 0n
    } as types.Strategy
    await db.query(
      toUpsertSql('strategy', 'chain_id, address', strategy),
      Object.values(strategy)
    )

    const harvest = {
      chainId: 1,
      address: addresses.v2.strategystEthAccumulator_v2,
      profit: 122295812297070635612n,
      loss: 0n,
      totalProfit: 1205071216861557778611n,
      totalLoss: 0n,
      totalDebt: 25247124300383549383601n,
      blockNumber: 17613565n,
      blockTime: 1n,
      blockIndex: 1,
      transactionHash: '0x0000000001'
    } as types.Harvest
    await db.query(
      toUpsertSql('harvest', 'chain_id, block_number, block_index, address', harvest),
      Object.values(harvest)
    )
    await db.query(
      toUpsertSql('harvest', 'chain_id, block_number, block_index, address', harvest),
      Object.values({
        ...harvest,
        profit: 194459789900456241429n,
        totalProfit: 1399531006762014020040n,
        totalDebt: 33677195107170865265139n,
        blockNumber: 18116044n,
        blockTime: BigInt(70 * 24 * 60 * 60 + (9 * 60 * 60)),
        transactionHash: '0x0000000002'
      })
    )
  },

  down: async () => {
    await db.query('DELETE FROM apr WHERE chain_id = $1 AND address = $2', [1, addresses.v2.strategystEthAccumulator_v2])
    await db.query('DELETE FROM harvest WHERE chain_id = $1 AND address = $2', [1, addresses.v2.strategystEthAccumulator_v2])
    await db.query('DELETE FROM strategy WHERE chain_id = $1 AND vault_address = $2', [1, addresses.v2.yvweth])
    await db.query('DELETE FROM vault WHERE chain_id = $1 AND address = $2', [1, addresses.v2.yvweth])
  }
}

export const yvusdcaDb = {
  up: async () => {
    const vault = {
      chainId: 137, type: 'vault',
      address: addresses.v3.yvusdca,
      assetAddress: addresses.v3.usdc,
      decimals: 6,
      asOfBlockNumber: 0n
    } as types.Vault
    await db.query(
      toUpsertSql('vault', 'chain_id, address', vault), 
      Object.values(vault)
    )

    const compoundV3UsdcLender = {
      chainId: 137, type: 'vault',
      address: addresses.v3.compoundV3UsdcLender,
      assetAddress: addresses.v3.usdc,
      decimals: 6,
      asOfBlockNumber: 0n
    } as types.Vault
    await db.query(
      toUpsertSql('vault', 'chain_id, address', compoundV3UsdcLender), 
      Object.values(compoundV3UsdcLender)
    )

    await db.query(toUpsertSql('withdrawal_queue', 'chain_id, vault_address, queue_index', {
      chainId: 137,
      vaultAddress: addresses.v3.yvusdca,
      queueIndex: 0,
      strategyAddress: addresses.v3.compoundV3UsdcLender,
      asOfBlockNumber: 0n
    }), [137, addresses.v3.yvusdca, 0, addresses.v3.compoundV3UsdcLender, 0n])

    const aaveV3UsdcLender = {
      chainId: 137, type: 'vault',
      address: addresses.v3.aaveV3UsdcLender,
      assetAddress: addresses.v3.usdc,
      decimals: 6,
      asOfBlockNumber: 0n
    } as types.Vault
    await db.query(
      toUpsertSql('vault', 'chain_id, address', aaveV3UsdcLender), 
      Object.values(aaveV3UsdcLender)
    )

    await db.query(toUpsertSql('withdrawal_queue', 'chain_id, vault_address, queue_index', {
      chainId: 137,
      vaultAddress: addresses.v3.yvusdca,
      queueIndex: 1,
      strategyAddress: addresses.v3.aaveV3UsdcLender,
      asOfBlockNumber: 0n
    }), [137, addresses.v3.yvusdca, 0, addresses.v3.aaveV3UsdcLender, 0n])

    const stargateUsdcStaker = {
      chainId: 137, type: 'vault',
      address: addresses.v3.stargateUsdcStaker,
      assetAddress: addresses.v3.usdc,
      decimals: 6,
      asOfBlockNumber: 0n
    } as types.Vault
    await db.query(
      toUpsertSql('vault', 'chain_id, address', stargateUsdcStaker), 
      Object.values(stargateUsdcStaker)
    )

    await db.query(toUpsertSql('withdrawal_queue', 'chain_id, vault_address, queue_index', {
      chainId: 137,
      vaultAddress: addresses.v3.yvusdca,
      queueIndex: 1,
      strategyAddress: addresses.v3.stargateUsdcStaker,
      asOfBlockNumber: 0n
    }), [137, addresses.v3.yvusdca, 0, addresses.v3.stargateUsdcStaker, 0n])
  },

  down: async () => {
    await db.query('DELETE FROM vault;')
    await db.query('DELETE FROM strategy;')
    await db.query('DELETE FROM withdrawal_queue;')
    await db.query('DELETE FROM harvest;')
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

export function withYvUsdcaDb(fn: (this: any) => Promise<void>) {
  return async function(this: any) {
    try {
      await yvusdcaDb.up()
    } catch(e) {
      console.error(e)
      throw e
    }

    try {
      await fn.call(this)
    } finally {
      await yvusdcaDb.down()
    }
  }
}
