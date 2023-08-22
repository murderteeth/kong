import { mq, types } from 'lib'
import db from '../../db'
import { Worker } from 'bullmq'
import { Processor } from '../../processor'

export class YearnVaultLoader implements Processor {
  worker: Worker | undefined

  async up() {
    this.worker = mq.worker(mq.q.yearn.vault.load, async job => {
      const vault = job.data as types.Vault
      console.log('📀', 'vault', vault.chainId, vault.address, vault.asOfBlockNumber)
      await upsert(vault)
    })
  }

  async down() {
    await this.worker?.close()
  }
}

export async function upsert(vault: types.Vault) {
  const query = `
    INSERT INTO public.vault (
      chain_id, address, version, symbol, name, decimals, total_assets,
      asset_address, asset_name, asset_symbol, 
      as_of_block_number, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (chain_id, address) 
    DO UPDATE SET
      version = $3,
      symbol = $4,
      name = $5,
      decimals = $6,
      total_assets = $7,
      asset_address = $8,
      asset_name = $9,
      asset_symbol = $10,
      as_of_block_number = $11,
      updated_at = NOW()
    WHERE vault.as_of_block_number < EXCLUDED.as_of_block_number;
  `
  const values = [
    vault.chainId, 
    vault.address,
    vault.apiVersion,
    vault.symbol,
    vault.name,
    vault.decimals,
    vault.totalAssets,
    vault.assetAddress,
    vault.assetName,
    vault.assetSymbol,
    vault.asOfBlockNumber
  ]

  await db.query(query, values)
}
