import { math, mq, multicall3, types } from 'lib'
import db, { firstRow, getApiVersion } from '../db'
import { rpcs } from '../rpcs'
import { ReadContractParameters, parseAbi } from 'viem'
import { Processor } from 'lib/processor'
import { Queue } from 'bullmq'
import { estimateHeight, getBlock } from 'lib/blocks'
import { extractFeesBps, extractWithdrawalQueue } from '../extract/vault/version2'
import { mainnet } from 'viem/chains'
import { compare } from 'compare-versions'
import { endOfDay } from 'lib/dates'
import { extractDefaultQueue } from '../extract/vault/version3'

export class ApyComputer implements Processor {
  queue: Queue | undefined

  async up() {
    this.queue = mq.queue(mq.q.load)
  }

  async down() {
    await this.queue?.close()
  }

  async compute({ chainId, address, time }
    : { chainId: number, address: `0x${string}`, time: bigint }) 
  {
    let blockNumber: bigint = 0n
    if(time > BigInt((new Date()).getTime() * 1000)) {
      blockNumber = await rpcs.next(chainId).getBlockNumber()
    } else {
      blockNumber = await estimateHeight(chainId, time)
    }

    if(!multicall3.supportsBlock(chainId, BigInt(blockNumber))) {
      console.warn('🚨', 'block not supported', chainId, blockNumber)
      return
    }

    const apy = await _compute(chainId, address, blockNumber)
    if(apy === null) return

    const artificialBlockTime = endOfDay(time)
    apy.blockTime = artificialBlockTime

    await this.queue?.add(mq.job.load.apy, apy, {
      jobId: `${chainId}-${blockNumber}-${address}-apy`
    })
  }
}

export async function _compute(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const { apiVersion, type, activationBlockNumber } = await firstRow(`
    SELECT api_version as "apiVersion", type, activation_block_number as "activationBlockNumber" FROM vault WHERE chain_id = $1 AND address = $2;`,
    [chainId, address]
  )

  if(!apiVersion) {
    console.warn('🚨', '!apiVersion', chainId, address)
    return null
  }

  let inceptionBlockNumber = 0n

  if(type === 'strategy' || compare(apiVersion, '3.0.0', '<')) {
    const [first, second] = await getFirstTwoHarvestBlocks(chainId, address)

    if(!(first && second)) {
      console.warn('🚨', 'harvests < 2', chainId, address)
      return null
    }
  
    if(first > blockNumber) {
      console.warn('🚨', 'first > blockNumber', chainId, address)
      return null
    }

    inceptionBlockNumber = first
  } else {
    inceptionBlockNumber = BigInt(activationBlockNumber)
  }

  const block = await getBlock(chainId, blockNumber)

  const result = {
    chainId,
    address,
    weeklyNet: undefined,
    weeklyPricePerShare: undefined,
    weeklyBlockNumber: 0n,
    monthlyNet: undefined,
    monthlyPricePerShare: undefined,
    monthlyBlockNumber: 0n,
    inceptionNet: 0,
    inceptionPricePerShare: 0n,
    inceptionBlockNumber,
    net: 0,
    grossApr: 0,
    pricePerShare: 0n,
    blockNumber: block.number,
    blockTime: block.timestamp,
  } as types.APY

  const ppsParameters = {
    address, functionName: 'pricePerShare' as never,
    abi: parseAbi(['function pricePerShare() returns (uint256)'])
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

  result.weeklyNet = result.weeklyPricePerShare === undefined ? undefined : compoundAndAnnualizeDelta(
    { block: result.weeklyBlockNumber, pps: result.weeklyPricePerShare }, 
    { block: blockNumber, pps: result.pricePerShare }, blocksPerDay
  )

  result.monthlyNet = result.monthlyPricePerShare === undefined ? undefined : compoundAndAnnualizeDelta(
    { block: result.monthlyBlockNumber, pps: result.monthlyPricePerShare },
    { block: blockNumber, pps: result.pricePerShare }, blocksPerDay
  )

  result.inceptionNet = compoundAndAnnualizeDelta(
    { block: result.inceptionBlockNumber, pps: result.inceptionPricePerShare },
    { block: blockNumber, pps: result.pricePerShare }, blocksPerDay
  )

  const candidates: (number | undefined)[] = []
	if(chainId !== mainnet.id) {
		candidates.push(result.weeklyNet, result.monthlyNet, result.inceptionNet)
	} else {
		candidates.push(result.monthlyNet, result.weeklyNet, result.inceptionNet)
	}

  result.net = candidates.find(apy => apy !== undefined) ?? (() => { throw new Error('!candidates') })()

  const annualCompoundingPeriods = 52
  const fees = compare(apiVersion, '3.0.0', '>=')
  ? await extractFees__v3(chainId, address, blockNumber)
  : await extractFees__v2(chainId, address, blockNumber)

  const netApr = result.net > 0
  ? annualCompoundingPeriods * Math.pow(result.net + 1, 1 / annualCompoundingPeriods) - annualCompoundingPeriods
  : 0

  result.grossApr = fees.performance === 1
  ? netApr + fees.management
  : netApr / (1 - fees.performance) + fees.management

  if(result.net < 0) {
    if(compare(apiVersion, '0.3.5', '>=')) {
      result.net = 0
    }
  }

  result.lockedProfit = compare(apiVersion, '3.0.0', '>=')
  ? await extractLockedProfit__v3(chainId, address, blockNumber)
  : await extractLockedProfit__v2(chainId, address, blockNumber)

  return result
}

function compoundAndAnnualizeDelta(
  before: { block: bigint, pps: bigint }, 
  after: { block: bigint, pps: bigint }, 
  blocksPerDay: bigint
) {
	const delta = math.div(after.pps - before.pps, before.pps || 1n)
	const period = math.div((after.block - before.block), blocksPerDay)
  return Math.pow(1 + delta, 365.2425 / period) - 1
}

export async function hasAtLeastTwoHarvests(chainId: number, address: `0x${string}`) {
  const firstTwo = await getFirstTwoHarvestBlocks(chainId, address)
  return firstTwo.length === 2
}

async function getFirstTwoHarvestBlocks(chainId: number, vault: `0x${string}`) {
  const result = await db.query(`
    SELECT h.block_number as "blockNumber"
    FROM harvest h
    LEFT JOIN vault v 
      ON v.chain_id = h.chain_id 
      AND v.address = h.address
    LEFT JOIN strategy s 
      ON s.chain_id = h.chain_id 
      AND s.address = h.address
    WHERE h.chain_id = $1 AND (
      v.address = $2
      OR s.vault_address = $2
    )
    ORDER BY h.block_number ASC
    LIMIT 2;
  `, [chainId, vault])

  return result.rows.map(r => BigInt(r.blockNumber))
}

export async function extractFees__v2(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const strategies = await extractWithdrawalQueue(chainId, address, blockNumber)

  const strategiesMulticall = await rpcs.next(chainId, blockNumber).multicall({ contracts: strategies.map(s => ({
    args: [s as string], address, functionName: 'strategies', abi: parseAbi(['function strategies(address) returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)'])
  })), blockNumber})

  const strategistFeesBps = strategiesMulticall.map(strategy => {
    if(strategy.status === 'failure') return 0n
    const fees = (strategy.result as bigint [])[0]
    const debtRatio = (strategy.result as bigint [])[2]
    return (fees * debtRatio) || 0n
  }).reduce((a, b) => a + b, 0n)

  const vaultFeesBps = await extractFeesBps(chainId, address, blockNumber)

  return {
    performance: math.div(strategistFeesBps + vaultFeesBps.performance, 10_000n),
    management: math.div(vaultFeesBps.management, 10_000n)
  }
}

async function extractAccountant(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  try {
    return await rpcs.next(chainId, blockNumber).readContract({
      address, 
      abi: parseAbi(['function accountant() view returns (address)']),
      functionName: 'accountant'
    })
  } catch(error) {
    return undefined
  }  
}

export async function extractLockedProfit__v2(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const DEGRADATION_COEFFICIENT = 10n ** 18n
  const multicallResult = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
    {
      address, functionName: 'lastReport',
      abi: parseAbi(['function lastReport() returns (uint256)'])
    },
    {
      address, functionName: 'lockedProfit',
      abi: parseAbi(['function lockedProfit() returns (uint256)'])
    },
    {
      address, functionName: 'lockedProfitDegradation',
      abi: parseAbi(['function lockedProfitDegradation() returns (uint256)'])
    }
  ], blockNumber })

  if(multicallResult.some(r => r.status === 'failure')) {
    console.warn('🚨', 'extractLockedProfit__v2', 'multicall fail', chainId, address, blockNumber)
    return undefined
  }

  const lastReport = multicallResult[0].result as bigint
  const lockedProfit = multicallResult[1].result as bigint
  const lockedProfitDegradation = multicallResult[2].result as bigint

  const lockedFundsRatio = (blockNumber - lastReport) * lockedProfitDegradation
  if(lockedFundsRatio < DEGRADATION_COEFFICIENT) {
    return lockedProfit - BigInt(Math.floor(math.div(lockedFundsRatio * lockedProfit, DEGRADATION_COEFFICIENT)))
  } else {
    return 0n
  }
}

export async function extractLockedProfit__v3(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  try {
    const shares = await rpcs.next(chainId, blockNumber).readContract({
      address,
      abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
      functionName: 'balanceOf',
      args: [ address ],
      blockNumber
    })
    return await rpcs.next(chainId, blockNumber).readContract({
      address,
      abi: parseAbi(['function convertToAssets(uint256) view returns (uint256)']),
      functionName: 'convertToAssets',
      args: [ shares ],
      blockNumber
    })
  } catch(error) {
    console.warn('🚨', 'extractLockedProfit__v3', 'readContract fail', chainId, address, blockNumber)
    console.warn(error)
    return undefined
  }
}

export async function extractFees__v3(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const accountant = await extractAccountant(chainId, address, blockNumber)
  if(!accountant) {
    try {
      const performanceFeeBps = await rpcs.next(chainId, blockNumber).readContract({
        address, 
        abi: parseAbi(['function performanceFee() view returns (uint16)']),
        functionName: 'performanceFee'    
      })
      return {
        performance: performanceFeeBps / 10_000,
        management: 0
      }
    } catch(error) {
      console.warn('🚨', '!accountant && !performanceFees')
      return {
        performance: 0,
        management: 0
      }
    }
  }

  const strategies = await extractDefaultQueue({ chainId, address }, blockNumber)
  if(strategies.length === 0) return {
    performance: 0,
    management: 0
  }

  const strategyMulticalls = strategies.map(s => [
    {
      address,
      abi: parseAbi(['function strategies(address) view returns (uint256, uint256, uint256, uint256)']),
      functionName: 'strategies',
      args: [s as string]
    },
    {
      address: accountant,
      abi: parseAbi(['function useCustomConfig(address, address) view returns (bool)']),
      functionName: 'useCustomConfig',
      args: [address, s as string]
    },
    {
      address: accountant,
      abi: parseAbi(['function customConfig(address, address) view returns (uint16, uint16, uint16, uint16, uint16, uint16)']),
      functionName: 'customConfig',
      args: [address, s as string]
    }
  ]).flat()

  const multicallResult = await rpcs.next(chainId, blockNumber).multicall({ contracts: [
    {
      address: accountant,
      abi: parseAbi(['function defaultConfig() view returns (uint16, uint16, uint16, uint16, uint16, uint16)']),
      functionName: 'defaultConfig'
    },
    {
      address,
      abi: parseAbi(['function totalDebt() view returns (uint256)']),
      functionName: 'totalDebt'
    },
    ...strategyMulticalls
  ], blockNumber})

  const defaultConfigResult = multicallResult[0]
  const defaultManagementFee = defaultConfigResult.status === 'success' ?  (defaultConfigResult.result as number[])[0] : 0
  const defaultPerformanceFee = defaultConfigResult.status === 'success' ?  (defaultConfigResult.result as number[])[1] : 0
  const totalDebt = multicallResult[1].result as bigint
  const feesBps = { performance: 0, management: 0 }
  for(let i = 0; i < strategies.length; i++) {
    const vaultParameters = multicallResult[i * 3 + 2 + 0]
    const [ activation, lastReport, currentDebt, maxDebt ] = vaultParameters.result as bigint[]
    const debtRatio = math.div(currentDebt, totalDebt)

    const useCustomConfigResult = multicallResult[i * 3 + 2 + 1]
    const useCustomConfig = useCustomConfigResult.result as boolean
    if(useCustomConfig) {
      const customConfigResult = multicallResult[i * 3 + 2 + 2]
      const [ managementFee, performanceFee, refundRatio, maxFee, maxGain, maxLoss ] = customConfigResult.result as number []
      feesBps.performance += debtRatio * performanceFee
      feesBps.management += debtRatio * managementFee
    } else {
      feesBps.performance += debtRatio * defaultPerformanceFee
      feesBps.management += debtRatio * defaultManagementFee
    }
  }

  return {
    performance: feesBps.performance / 10_000,
    management: feesBps.management / 10_000
  }
}
