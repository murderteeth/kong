import { mq, types } from 'lib'
import db from '../../db'
import { Worker } from 'bullmq'
import { Processor } from '../../processor'

export class VaultLoader implements Processor {
  worker: Worker | undefined

  async up() {
    this.worker = mq.worker(mq.q.vault.n, async job => {
      if(job.name !== mq.q.vault.load) return
      const vault = job.data as types.Vault
      console.log('📀', mq.q.vault.n, vault.networkId, vault.address, vault.asOfBlockNumber)
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
      network_id, address, version, symbol, name, decimals, total_assets,
      base_asset_address, base_asset_name, base_asset_symbol, 
      as_of_block_number, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (network_id, address) 
    DO UPDATE SET
      version = $3,
      symbol = $4,
      name = $5,
      decimals = $6,
      total_assets = $7,
      base_asset_address = $8,
      base_asset_name = $9,
      base_asset_symbol = $10,
      as_of_block_number = $11,
      updated_at = NOW()
    WHERE vault.as_of_block_number < EXCLUDED.as_of_block_number;
  `
  const values = [
    vault.networkId, 
    vault.address,
    vault.apiVersion,
    vault.symbol,
    vault.name,
    vault.decimals,
    vault.totalAssets,
    vault.baseAssetAddress,
    vault.baseAssetName,
    vault.baseAssetSymbol,
    vault.asOfBlockNumber
  ]

  await db.query(query, values)
}
