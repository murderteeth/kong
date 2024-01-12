import { expect } from 'chai'
import { polygon } from 'viem/chains'
import { addresses } from '../../test.fixture'
import { extractAsset, extractDebts, extractDefaultQueue, extractFeesBps, extractFields, extractRegistration, getAsset, getRegistration } from './version3'
import { types } from 'lib'
import db, { toUpsertSql } from '../../db'

describe('vault v3', function() {
  this.timeout(10_000)
  const block = 51413288n

  it('extracts registrations', async function() {
    const vault = {
      chainId: polygon.id, registryAddress: addresses.v3.registry, address: addresses.v3.yvusdca
    } as types.Vault

    const registration = await extractRegistration(vault, block)
    expect(registration.type).to.equal('vault')
    expect(registration.activationBlockNumber).to.equal(49181585n)
    expect(registration.activationBlockTime).to.equal(1698338748n)
  })

  it('gets registrations from db', async function() {
    const vault = {
      chainId: polygon.id, registryAddress: addresses.v3.registry, address: addresses.v3.yvusdca,
      type: 'vault', activationBlockNumber: 49181585n, activationBlockTime: 1698338748n
    } as types.Vault
    await db.query(toUpsertSql('vault', 'chain_id, address', vault), Object.values(vault))

    const registration = await getRegistration(vault)
    expect(registration?.type).to.equal('vault')
    expect(registration?.activationBlockNumber).to.equal(49181585)
    expect(registration?.activationBlockTime).to.equal(1698338748n)
  })

  it('extracts fields', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.yvusdca
    } as types.Vault

    const fields = await extractFields(vault, block)
    expect(fields.name).to.equal('USDC yVault-A')
    expect(fields.symbol).to.equal('yvUSDC-A')
    expect(fields.decimals).to.equal(6)
    expect(fields.assetAddress).to.equal('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174')
    expect(fields.totalAssets).to.equal(23521100225n)
    expect(fields.totalDebt).to.equal(23521100225n)
    expect(fields.totalIdle).to.equal(0n)
    expect(fields.minimumTotalIdle).to.equal(0n)
    expect(fields.profitMaxUnlockTime).to.equal(604800n)
    expect(fields.profitUnlockingRate).to.equal(653767704174258n)
    expect(fields.fullProfitUnlockDate).to.equal(1703780205n)
    expect(fields.lastProfitUpdate).to.equal(1703177607n)
    expect(fields.depositLimit).to.equal(100000000000n)
    expect(fields.accountant).to.equal('0x54483f1592ab0aDea2757Ae0d62e6393361d4CEe')
    expect(fields.roleManager).to.equal('0xC4ad0000E223E398DC329235e6C497Db5470B626')
    expect(fields.isShutdown).to.equal(false)
  })

  it('extracts vault fees', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.yvusdca,
      accountant: '0x54483f1592ab0aDea2757Ae0d62e6393361d4CEe'
    } as types.Vault

    const fees = await extractFeesBps(vault, block)
    expect(fees.managementFee).to.equal(0)
    expect(fees.performanceFee).to.equal(1000)
  })

  it('extracts tokenized strategy fees', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.compoundV3UsdcLender
    } as types.Vault

    const fees = await extractFeesBps(vault, block)
    expect(fees.managementFee).to.equal(0)
    expect(fees.performanceFee).to.equal(1000)
  })

  it('extracts asset', async function() {
    const asset = await extractAsset(polygon.id, '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', block)
    expect(asset?.assetName).to.equal('USD Coin (PoS)')
    expect(asset?.assetSymbol).to.equal('USDC')
  })

  it('gets asset from db', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.yvusdca,
      assetName: 'USD Coin (PoS)', assetSymbol: 'USDC'
    } as types.Vault
    await db.query(toUpsertSql('vault', 'chain_id, address', vault), Object.values(vault))

    const asset = await getAsset(vault)
    expect(asset?.assetName).to.equal('USD Coin (PoS)')
    expect(asset?.assetSymbol).to.equal('USDC')
  })

  it('extracts default queue', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.yvusdca,
      type: 'vault'
    } as types.Vault

    const queue = await extractDefaultQueue(vault, block)
    expect(queue).to.have.all.members([
      addresses.v3.aaveV3UsdcLender,
      addresses.v3.compoundV3UsdcLender,
      addresses.v3.stargateUsdcStaker
    ])
  })

  it('extracts no queue', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.compoundV3UsdcLender,
      type: 'strategy'
    } as types.Vault

    const queue = await extractDefaultQueue(vault, block)
    expect(queue).to.have.all.members([])
  })

  it('extracts debts with debtManager', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.yvusdca,
      debtManager: addresses.v3.yvusdca_debtManager,
      type: 'vault'
    } as types.Vault

    const queue = await extractDefaultQueue(vault, 51825988n)
    const debts = await extractDebts(vault, queue, 51825988n)

    expect(debts[0].maxDebt).to.equal(1000000000000n)
    expect(debts[0].currentDebt).to.equal(117615395339n)
    expect(debts[0].currentDebtRatio).to.equal(Math.floor(0.5215222005613652 * 10_000))
    expect(debts[0].targetDebtRatio).to.equal(5000)
    expect(debts[0].maxDebtRatio).to.equal(6000)
    
    expect(debts[1].maxDebt).to.equal(1000000000000n)
    expect(debts[1].currentDebt).to.equal(107907880971n)
    expect(debts[1].currentDebtRatio).to.equal(Math.floor(0.4784777994386348 * 10_000))
    expect(debts[1].targetDebtRatio).to.equal(5000)
    expect(debts[1].maxDebtRatio).to.equal(6000)

    expect(debts[2].maxDebt).to.equal(1000000000000n)
    expect(debts[2].currentDebt).to.equal(0n)
    expect(debts[2].currentDebtRatio).to.equal(0)
    expect(debts[2].targetDebtRatio).to.equal(0)
    expect(debts[2].maxDebtRatio).to.equal(0)
  })

  it('extracts only current debts without debtManager', async function() {
    const vault = {
      chainId: polygon.id, address: addresses.v3.yvusdca,
      type: 'vault'
    } as types.Vault

    const queue = await extractDefaultQueue(vault, 51825988n)
    const debts = await extractDebts(vault, queue, 51825988n)

    expect(debts[0].maxDebt).to.equal(1000000000000n)
    expect(debts[0].currentDebt).to.equal(117615395339n)
    expect(debts[0].currentDebtRatio).to.equal(Math.floor(0.5215222005613652 * 10_000))
    expect(debts[0].targetDebtRatio).to.equal(undefined)
    expect(debts[0].maxDebtRatio).to.equal(undefined)

    expect(debts[1].maxDebt).to.equal(1000000000000n)
    expect(debts[1].currentDebt).to.equal(107907880971n)
    expect(debts[1].currentDebtRatio).to.equal(Math.floor(0.4784777994386348 * 10_000))
    expect(debts[1].targetDebtRatio).to.equal(undefined)
    expect(debts[1].maxDebtRatio).to.equal(undefined)
   
    expect(debts[2].maxDebt).to.equal(1000000000000n)
    expect(debts[2].currentDebt).to.equal(0n)
    expect(debts[2].currentDebtRatio).to.equal(0)
    expect(debts[2].targetDebtRatio).to.equal(undefined)
    expect(debts[2].maxDebtRatio).to.equal(undefined)
  })
})
