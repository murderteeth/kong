import { z } from 'zod'
import { zhexstring } from 'lib/types'
import { firstRow } from '../../../../../db'

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const lastReportDetail = await fetchLastReportDetail(chainId, address)
  return { lastReportDetail }
}

async function fetchLastReportDetail(chainId: number, address: `0x${string}`) {
  const row = await firstRow(`
  SELECT *
  FROM evmlog
  WHERE chain_id = $1
    AND address = $2
    AND event_name = 'Reported'
  ORDER BY block_number DESC, log_index DESC
  LIMIT 1;`, [chainId, address])

  if (!row) return undefined

  return z.object({
    chainId: z.number(),
    address: zhexstring,
    blockNumber: z.bigint({ coerce: true }),
    blockTime: z.bigint({ coerce: true }),
    apr: z.object({
      gross: z.number(),
      net: z.number()
    }),
    profit: z.bigint({ coerce: true }),
    loss: z.bigint({ coerce: true }),
    protocolFees: z.bigint({ coerce: true }),
    performanceFees: z.bigint({ coerce: true }),
    profitUsd: z.number(),
    lossUsd: z.number(),
    protocolFeesUsd: z.number(),
    performanceFeesUsd: z.number()

  }).parse({
    chainId: row.chain_id,
    address: row.address,
    blockNumber: row.block_number,
    blockTime: row.block_time,
    ...row.args,
    ...row.hook

  })
}
