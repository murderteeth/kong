import { z } from 'zod'
import { EvmLog, EvmLogSchema, StrideSchema, SyncDirectionEnum } from 'lib/types'
import db from '../db'
import grove from 'lib/grove'
import { strider } from 'lib'

export default async function sync(data: any) {
  // const { direction } = z.object({
  //   direction: SyncDirectionEnum
  // }).parse(data)
  const direction = SyncDirectionEnum.enum['local->grove']

  switch (direction) {
    case 'local->grove':
      await localToGrove()
      break
    // case 'grove->local':
    //   throw new Error(`not implemented: ${direction}`)
  }
}

async function localToGrove() {
  const batchLimit = 1_000
  let batchCounter = 0

  const allstrides = (await db.query(`SELECT chain_id as "chainId", address, strides FROM evmlog_strides;`)).rows
  for (const record of allstrides) {
    const { chainId, address, strides } = record
    const localStrides = StrideSchema.array().parse(JSON.parse(strides))
    const groveStrides = await grove().fetchStrides(chainId, address)
    let nextStrides = groveStrides

    for (const localStride of localStrides) {
      const batch: EvmLog[] = []
      console.log('-----------', 'localStride', localStride)
      const outOfSync = strider.plan(localStride.from, localStride.to, groveStrides)
      console.log('-----------', 'outOfSync', outOfSync)

      for (const stride of outOfSync) {
        console.log('-----------', 'stride', stride)
        console.log('-----------', '[]', chainId, address, stride.from, stride.to)
        const logs = await fetchLogs(chainId, address, stride)
        console.log('-----------', 'logs', logs.length)
        const flow = getFlow(logs, batchLimit - batchCounter)
        batch.push(...flow)
        batchCounter += flow.length
        console.log('-----------', 'flow', flow.length)
        if (batchCounter >= batchLimit) break
      }

      console.log('-----------', 'batch', batch.length)
      if (batch.length === 0) continue

      await Promise.all(batch.map(log => grove().storeLog(log)))

      nextStrides = strider.add({
        from: batch[0].blockNumber,
        to: batch[batch.length - 1].blockNumber
      }, nextStrides)
    }

    await grove().storeStrides(chainId, address, nextStrides)
  }
}

export function getFlow(logs: EvmLog[], limit: number): EvmLog[] {
  return logs.filter((log, index, self) =>
    self.findIndex(l => l.blockNumber === log.blockNumber) < limit
  )
}

async function fetchLogs(chainId: number, address: string, stride: { from: bigint, to: bigint }): Promise<EvmLog[]> {
  return EvmLogSchema.array().parse((await db.query(
    `SELECT 
      chain_id as "chainId",
      address,
      event_name as "eventName",
      signature,
      topics,
      args,
      post,
      block_number as "blockNumber",
      block_time as "blockTime",
      log_index as "logIndex",
      transaction_hash as "transactionHash",
      transaction_index as "transactionIndex"
    FROM evmlog 
    WHERE 
      chain_id = $1 
      AND address = $2 
      AND block_number >= $3 
      AND block_number <= $4
    ORDER BY
      block_number,
      log_index;`,
    [chainId, address, stride.from, stride.to])
  ).rows)
}
