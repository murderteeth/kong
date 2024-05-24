import { z } from 'zod'
import { Data } from '../../../../extract/timeseries'
import { EvmAddressSchema, Output, OutputSchema, Thing, ThingSchema } from 'lib/types'
import { first } from '../../../../db'
import { estimateHeight, getBlock } from 'lib/blocks'
import { math, multicall3 } from 'lib'
import { ReadContractParameters } from 'viem'
import { mainnet } from 'viem/chains'
import { rpcs } from '../../../../rpcs'
import abi from '../../abi'

export const outputLabel = 'apy-bwd-delta-pps-generic'

export const ApySchema = z.object({
  chainId: z.number(),
  address: EvmAddressSchema,
  latest: z.number(),
  pricePerShare: z.bigint({ coerce: true }),
  blockNumber: z.bigint({ coerce: true }),
  blockTime: z.bigint({ coerce: true }),
  weekly: z.number().nullish(),
  weeklyPricePerShare: z.bigint({ coerce: true }).nullish(),
  weeklyBlockNumber: z.bigint({ coerce: true }),
  monthly: z.number().nullish(),
  monthlyPricePerShare: z.bigint({ coerce: true }).nullish(),
  monthlyBlockNumber: z.bigint({ coerce: true }),
  inception: z.number(),
  inceptionPricePerShare: z.bigint({ coerce: true }),
  inceptionBlockNumber: z.bigint({ coerce: true })
})

export type Apy = z.infer<typeof ApySchema>

export default async function process(chainId: number, address: `0x${string}`, data: Data): Promise<Output[]> {
  console.info('🧮', data.outputLabel, chainId, address, (new Date(Number(data.blockTime) * 1000)).toDateString())

  let blockNumber: bigint = 0n
  if(data.blockTime >= BigInt(Math.floor(new Date().getTime() / 1000))) {
    blockNumber = (await getBlock(chainId)).number
  } else {
    blockNumber = await estimateHeight(chainId, data.blockTime)
  }

  if(!multicall3.supportsBlock(chainId, blockNumber)) {
    console.warn('🚨', 'block not supported', chainId, blockNumber)
    return []
  }

  const vault = await first<Thing>(ThingSchema,
    'SELECT * FROM thing WHERE chain_id = $1 AND address = $2 AND label = $3',
    [chainId, address, 'vault']
  )

  if (!vault) return []

  const apy = await _compute(vault, blockNumber)
  if (!apy) return []

  return OutputSchema.array().parse([
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'latest', value: apy.latest
    },
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'pricePerShare', value: Number(apy.pricePerShare)
    },
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'weekly', value: apy.weekly
    },
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'weeklyPricePerShare', value: Number(apy.weeklyPricePerShare)
    },
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'weeklyBlockNumber', value: Number(apy.weeklyBlockNumber)
    },
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'monthly', value: apy.monthly
    },
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'monthlyPricePerShare', value: Number(apy.monthlyPricePerShare)
    },
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'monthlyBlockNumber', value: Number(apy.monthlyBlockNumber)
    },
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'inception', value: apy.inception
    },
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'inceptionPricePerShare', value: Number(apy.inceptionPricePerShare)
    },
    {
      chainId, address, blockNumber: apy.blockNumber, blockTime: apy.blockTime, 
      label: data.outputLabel, component: 'inceptionBlockNumber', value: Number(apy.inceptionBlockNumber)
    }
  ])
}

export async function _compute(vault: Thing, blockNumber: bigint) {
  if (!vault.defaults.inceptBlock) return undefined
  const { chainId, address } = vault
  const block = await getBlock(chainId, blockNumber)

  const result = ApySchema.parse({
    chainId,
    address,
    latest: 0,
    pricePerShare: 0n,
    blockNumber: block.number,
    blockTime: block.timestamp,
    weekly: undefined,
    weeklyPricePerShare: undefined,
    weeklyBlockNumber: 0n,
    monthly: undefined,
    monthlyPricePerShare: undefined,
    monthlyBlockNumber: 0n,
    inception: 0,
    inceptionPricePerShare: 0n,
    inceptionBlockNumber: vault.defaults.inceptBlock
  })

  const ppsParameters = {
    abi, address, functionName: 'convertToAssets',
    args: [10n ** BigInt(vault.defaults.decimals ?? 0n)]
  } as ReadContractParameters

  const day = 24n * 60n * 60n
  result.weeklyBlockNumber = await estimateHeight(chainId, block.timestamp - 7n * day)
  result.monthlyBlockNumber = await estimateHeight(chainId, block.timestamp - 30n * day)

  result.pricePerShare = await rpcs.next(chainId, blockNumber).readContract({...ppsParameters, blockNumber}) as bigint
  result.inceptionPricePerShare = await rpcs.next(chainId, result.inceptionBlockNumber).readContract({...ppsParameters, blockNumber: result.inceptionBlockNumber}) as bigint

  if (result.pricePerShare === result.inceptionPricePerShare) return result

  result.weeklyPricePerShare = result.weeklyBlockNumber < result.inceptionBlockNumber ? undefined : await rpcs.next(chainId, result.weeklyBlockNumber).readContract({...ppsParameters, blockNumber: result.weeklyBlockNumber}) as bigint
  result.monthlyPricePerShare = result.monthlyBlockNumber < result.inceptionBlockNumber ? undefined : await rpcs.next(chainId, result.monthlyBlockNumber).readContract({...ppsParameters, blockNumber: result.monthlyBlockNumber}) as bigint

  const blocksPerDay = (blockNumber - result.weeklyBlockNumber) / 7n

  result.weekly = result.weeklyPricePerShare === undefined ? undefined : compoundAndAnnualizeDelta(
    { block: result.weeklyBlockNumber, pps: result.weeklyPricePerShare }, 
    { block: blockNumber, pps: result.pricePerShare }, blocksPerDay
  )

  result.monthly = result.monthlyPricePerShare === undefined ? undefined : compoundAndAnnualizeDelta(
    { block: result.monthlyBlockNumber, pps: result.monthlyPricePerShare },
    { block: blockNumber, pps: result.pricePerShare }, blocksPerDay
  )

  result.inception = compoundAndAnnualizeDelta(
    { block: result.inceptionBlockNumber, pps: result.inceptionPricePerShare },
    { block: blockNumber, pps: result.pricePerShare }, blocksPerDay
  )

  const candidates: (number | undefined)[] = []
	if(chainId !== mainnet.id) {
		candidates.push(result.weekly, result.monthly, result.inception)
	} else {
		candidates.push(result.monthly, result.weekly, result.inception)
	}

  result.latest = candidates.find(apy => apy !== undefined) ?? (() => { throw new Error('!candidates') })()

  // const annualCompoundingPeriods = 52

  // const netApr = result.latest > 0
  // ? annualCompoundingPeriods * Math.pow(result.latest + 1, 1 / annualCompoundingPeriods) - annualCompoundingPeriods
  // : 0

  return result
}

function compoundAndAnnualizeDelta(
  before: { block: bigint, pps: bigint }, 
  after: { block: bigint, pps: bigint }, 
  blocksPerDay: bigint
) {
	const delta = math.div(after.pps - before.pps, before.pps || 1n)
  const period = math.div((BigInt(after.block) - BigInt
  (before.block)), blocksPerDay)
  return Math.pow(1 + delta, 365.2425 / period) - 1
}
