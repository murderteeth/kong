'use client'

import { z } from 'zod'
import Frosty from './Frosty'
import { useData } from '@/hooks/useData'
import LineItem, { padLineItemValue } from './LineItem'

const IndexStatsSchema = z.object({
  thing_total: z.number().optional().default(0),
  thing_vault_total: z.number().optional().default(0),
  thing_strategy_total: z.number().optional().default(0),
  thing_erc20_total: z.number().optional().default(0),
  thing_debtAllocator_total: z.number().optional().default(0),
  thing_accountant_total: z.number().optional().default(0),
  thing_tradeHandler_total: z.number().optional().default(0),
  output_total: z.number().optional().default(0),
  evmlog_total: z.number().optional().default(0),
  eventCounts: z.array(z.object({
    event_name: z.string(),
    count: z.number({ coerce: true })
  }))
})

export default function Things() {
  const { monitor } = useData()
  const { indexStatsJson } = monitor
  const indexStats = IndexStatsSchema.parse(JSON.parse(indexStatsJson))

  return <div className={'w-full flex flex-col items-start'}>
    <div className="w-full flex items-center justify-between">
      <div className="font-bold text-lg">Things</div>
      <Frosty _key={`thing_total-${indexStats.thing_total}`} disabled={indexStats.thing_total < 1}>{padLineItemValue(indexStats.thing_total)}</Frosty>
    </div>
    <LineItem label="vaults" value={indexStats.thing_vault_total} />
    <LineItem label="strategies" value={indexStats.thing_strategy_total} />
    <LineItem label="erc20s" value={indexStats.thing_erc20_total} />
    <LineItem label="debt allocators" value={indexStats.thing_debtAllocator_total} />
    <LineItem label="accountants" value={indexStats.thing_accountant_total} />
    <LineItem label="trade handlers" value={indexStats.thing_tradeHandler_total} />
    <LineItem label="outputs" value={indexStats.output_total} />
  </div>
}
