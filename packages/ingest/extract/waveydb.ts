import { chains, mq, types } from 'lib'
import { Queue } from 'bullmq'
import { Pool } from 'pg'
import { Processor } from 'lib/processor'
import { getAddress } from 'viem'

const db = new Pool({
  host: process.env.WAVEYDB_HOST,
  port: (process.env.WAVEYDB_PORT || 5432) as number,
  ssl: (process.env.WAVEYDB_SSL || false) as boolean,
  database: process.env.WAVEYDB_NAME,
  user: process.env.WAVEYDB_USER,
  password: process.env.WAVEYDB_PASSWORD,
  max: 4,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 60_000,
})

export class WaveyDbExtract implements Processor {
  queues: { [key: string]: Queue } = {}

  async up() {
    this.queues[mq.q.load] = mq.queue(mq.q.load)
  }

  async down() {
    await Promise.all(Object.values(this.queues).map(q => q.close()))
  }

  private expand(value: number, decimals: number) {
    return BigInt(Math.floor(value * 10 ** decimals))
  }

  async extract() {
    for(const chain of chains) {
      const result = await db.query(`
        SELECT 
          chain_id,
          block,
          -1 as index,
          timestamp,
          txn_hash,
          strategy_address,
          gain,
          loss,
          total_gain,
          total_loss,
          total_debt,
          debt_added,
          debt_paid,
          debt_ratio,
          want_token,
          want_price_at_block,
          vault_decimals
        FROM
          reports
        WHERE
          chain_id = $1;
      `, [chain.id])

      const harvests = result.rows.map(row => ({
        chainId: row.chain_id,
        address: getAddress(row.strategy_address),
        profit: this.expand(row.gain, row.vault_decimals),
        profitUsd: row.gain * row.want_price_at_block,
        loss: this.expand(row.loss, row.vault_decimals),
        lossUsd: row.loss * row.want_price_at_block,
        totalProfit: this.expand(row.total_gain, row.vault_decimals),
        totalProfitUsd: row.total_gain * row.want_price_at_block,
        totalLoss: this.expand(row.total_loss, row.vault_decimals),
        totalLossUsd: row.total_loss * row.want_price_at_block,
        totalDebt: this.expand(row.total_debt, row.vault_decimals),
        blockNumber: row.block,
        blockIndex: row.index,
        blockTime: row.timestamp,
        transactionHash: row.txn_hash
      } as types.Harvest))

      const stride = 10
      for(let i = 0; i < harvests.length; i += stride) {
        await this.queues[mq.q.load].add(mq.job.load.harvest, {
          batch: harvests.slice(i, i + stride)
        })
      }
    }
  }
}
