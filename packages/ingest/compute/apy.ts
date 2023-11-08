import { math, mq, multicall3, types } from 'lib'
import db from '../db'
import { rpcs } from 'lib/rpcs'
import { ReadContractParameters, parseAbi } from 'viem'
import { Processor } from 'lib/processor'
import { Queue } from 'bullmq'
import { estimateHeight, getBlock } from 'lib/blocks'
import { extractFeesBps, extractWithdrawalQueue } from '../extract/vault'
import { mainnet } from 'viem/chains'
import { compare } from 'compare-versions'
import { endOfDay } from 'lib/dates'

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
    let number: bigint = 0n
    if(time > BigInt((new Date()).getTime() * 1000)) {
      number = await rpcs.next(chainId).getBlockNumber()
    } else {
      number = await estimateHeight(chainId, time)
    }

    if(!multicall3.supportsBlock(chainId, BigInt(number))) {
      console.warn('🚨', 'block not supported', chainId, number)
      return
    }

    const apy = await _compute(chainId, address, number)
    if(apy === null) return

    const artificialBlockTime = endOfDay(time)
    apy.blockTime = artificialBlockTime

    await this.queue?.add(mq.job.load.apy, apy, {
      jobId: `${chainId}-${number}-${address}-apy`
    })
  }
}

export async function _compute(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const [inception, harvest2] = await getFirstTwoHarvestBlocks(chainId, address)
  if(!(inception && harvest2)) {
    console.warn('🚨', 'harvests < 2', chainId, address)
    return null
  }

  const block = await getBlock(chainId, blockNumber)

  const result = {
    chainId,
    address,
    weeklyNet: 0,
    weeklyPricePerShare: 0n,
    weeklyBlockNumber: 0n,
    monthlyNet: 0,
    monthlyPricePerShare: 0n,
    monthlyBlockNumber: 0n,
    inceptionNet: 0,
    inceptionPricePerShare: 0n,
    inceptionBlockNumber: inception,
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

  result.pricePerShare = await rpcs.next(chainId).readContract({...ppsParameters, blockNumber}) as bigint
  result.inceptionPricePerShare = await rpcs.next(chainId).readContract({...ppsParameters, blockNumber: result.inceptionBlockNumber}) as bigint

  if (result.pricePerShare === result.inceptionPricePerShare) return result

  const day = 24n * 60n * 60n
  result.weeklyBlockNumber = await estimateHeight(chainId, block.timestamp - 7n * day)
  result.monthlyBlockNumber = await estimateHeight(chainId, block.timestamp - 30n * day)
  
  result.weeklyPricePerShare = await rpcs.next(chainId).readContract({...ppsParameters, blockNumber: result.weeklyBlockNumber}) as bigint
  result.monthlyPricePerShare = await rpcs.next(chainId).readContract({...ppsParameters, blockNumber: result.monthlyBlockNumber}) as bigint

  const blocksPerDay = (blockNumber - result.weeklyBlockNumber) / 7n

  result.weeklyNet = compoundAndAnnualizeDelta(
    { block: result.weeklyBlockNumber, pps: result.weeklyPricePerShare }, 
    { block: blockNumber, pps: result.pricePerShare }, blocksPerDay
  )

  result.monthlyNet = compoundAndAnnualizeDelta(
    { block: result.monthlyBlockNumber, pps: result.monthlyPricePerShare }, 
    { block: blockNumber, pps: result.pricePerShare }, blocksPerDay
  )

  result.inceptionNet = compoundAndAnnualizeDelta(
    { block: result.inceptionBlockNumber, pps: result.inceptionPricePerShare }, 
    { block: blockNumber, pps: result.pricePerShare }, blocksPerDay
  )

  const candinets = []
	if(chainId !== mainnet.id) {
		candinets.push(result.weeklyNet, result.monthlyNet, result.inceptionNet)
	} else {
		candinets.push(result.monthlyNet, result.weeklyNet, result.inceptionNet)
	}

	result.net = candinets.find(apy => apy > 0) || 0

  const annualCompoundingPeriods = 52
  const fees = await getFees(chainId, address, blockNumber)

  const netApr = result.net > 0
  ? annualCompoundingPeriods * Math.pow(result.net + 1, 1 / annualCompoundingPeriods) - annualCompoundingPeriods
  : 0

  result.grossApr = fees.performance === 1
  ? netApr + fees.management
  : netApr / (1 - fees.performance) + fees.management

  if(result.net < 0) {
    const version = await getVaultVersion(chainId, address)
    if(compare(version, '0.3.5', '>=')) {
      result.net = 0
    }
  }

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

async function getFirstTwoHarvestBlocks(chainId: number, vault: `0x${string}`) {
  const result = await db.query(`
    SELECT h.block_number as "blockNumber"
    FROM harvest h
    JOIN strategy s 
      ON s.chain_id = h.chain_id 
      AND s.address = h.address
    WHERE h.chain_id = $1 AND s.vault_address = $2
    ORDER BY h.block_number ASC
    LIMIT 2;
  `, [chainId, vault])

  return result.rows.map(r => BigInt(r.blockNumber))
}

async function getFees(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  const strategies = await extractWithdrawalQueue(chainId, address, blockNumber)

  const strategiesMulticall = await rpcs.next(chainId).multicall({ contracts: strategies.map(s => ({
    args: [s as string], address, functionName: 'strategies', abi: parseAbi(['function strategies(address) returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256)'])
  })), blockNumber})

  const strategistFeesBps = strategiesMulticall.map(strategy => {
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

async function getVaultVersion(chainId: number, address: `0x${string}`) {
  const result = await db.query(`
    SELECT api_version as "apiVersion"
    FROM vault
    WHERE chain_id = $1 AND address = $2
  `, [chainId, address])

  return result.rows[0].apiVersion as string
}
