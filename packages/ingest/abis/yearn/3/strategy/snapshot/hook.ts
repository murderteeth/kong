import { z } from 'zod'
import { ThingSchema, zhexstring } from 'lib/types'
import { count, firstRow } from '../../../../../db'
import { mq } from 'lib'
import { rpcs } from 'lib/rpcs'
import { parseAbi } from 'viem'
import { fetchOrExtractErc20, throwOnMulticallError } from '../../../lib'
import { estimateCreationBlock } from 'lib/blocks'

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  await thing(chainId, address)
  const lastReportDetail = await fetchLastReportDetail(chainId, address)
  return { lastReportDetail }
}

async function thing(chainId: number, address: `0x${string}`) {
  const things = await count(`SELECT * FROM thing WHERE chain_id = $1 AND address = $2;`, [chainId, address])

  if (things < 2) {
    const multicall = await rpcs.next(chainId).multicall({ contracts: [
      { abi: parseAbi(['function apiVersion() view returns (string)']), address, functionName: 'apiVersion' },
      { abi: parseAbi(['function asset() view returns (address)']), address, functionName: 'asset' },
    ] })

    throwOnMulticallError(multicall)
    const [apiVersion, asset] = multicall
    const erc20 = await fetchOrExtractErc20(chainId, asset.result!)
    const { number: inceptBlock, timestamp: inceptTime } = await estimateCreationBlock(chainId, address)

    await mq.add(mq.job.load.thing, ThingSchema.parse({
      chainId,
      address,
      label: 'vault',
      defaults: {
        asset: erc20,
        decimals: erc20.decimals,
        apiVersion: apiVersion.result!,
        registry: address,
        inceptBlock,
        inceptTime
      }
    }))

    await mq.add(mq.job.load.thing, ThingSchema.parse({
      chainId,
      address,
      label: 'strategy',
      defaults: {
        asset: erc20,
        apiVersion: apiVersion.result!,
        registry: address,
        inceptBlock,
        inceptTime
      }
    }))
  }
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
    profit: z.bigint({ coerce: true }),
    loss: z.bigint({ coerce: true }),
    protocolFees: z.bigint({ coerce: true }),
    performanceFees: z.bigint({ coerce: true }),
    apr: z.object({
      gross: z.number(),
      net: z.number()
    }).default({ gross: 0, net: 0 }),
    profitUsd: z.number().default(0),
    lossUsd: z.number().default(0),
    protocolFeesUsd: z.number().default(0),
    performanceFeesUsd: z.number().default(0)

  }).parse({
    chainId: row.chain_id,
    address: row.address,
    blockNumber: row.block_number,
    blockTime: row.block_time,
    ...row.args,
    ...row.hook

  })
}
