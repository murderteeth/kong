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
      activation_timestamp, activation_block_number,
      as_of_block_number, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11::double precision), $12, $13, NOW())
    ON CONFLICT (chain_id, address) 
    DO UPDATE SET
      version = EXCLUDED.version,
      symbol = EXCLUDED.symbol,
      name = EXCLUDED.name,
      decimals = EXCLUDED.decimals,
      total_assets = EXCLUDED.total_assets,
      asset_address = EXCLUDED.asset_address,
      asset_name = EXCLUDED.asset_name,
      asset_symbol = EXCLUDED.asset_symbol,
      activation_timestamp = EXCLUDED.activation_timestamp,
      activation_block_number = EXCLUDED.activation_block_number,
      as_of_block_number = EXCLUDED.as_of_block_number,
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
    vault.activationTimestamp,
    vault.activationBlockNumber,
    vault.asOfBlockNumber
  ]

  await db.query(query, values)
}
