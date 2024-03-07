import { parseAbi, toEventSelector, zeroAddress } from 'viem'
import { rpcs } from '../../../../../rpcs'
import { zhexstring } from 'lib/types'
import db from '../../../../../db'

export default async function process(chainId: number, address: `0x${string}`, data: any) {
  const strategies = await projectStrategies(chainId, address)
  const withdrawalQueue = await extractWithdrawalQueue(chainId, address)
  return { strategies, withdrawalQueue }
}

export async function projectStrategies(chainId: number, vault: `0x${string}`) {
  const topics = [
    toEventSelector('event StrategyAdded(address indexed strategy, uint256 debtRatio, uint256 minDebtPerHarvest, uint256 maxDebtPerHarvest, uint256 performanceFee)'),
    toEventSelector('event StrategyMigrated(address indexed oldVersion, address indexed newVersion)'),
    toEventSelector('event StrategyRevoked(address indexed strategy)')
  ]

  const events = await db.query(`
  SELECT signature, args
  FROM evmlog
  WHERE chain_id = $1 AND address = $2 AND signature = ANY($3)
  ORDER BY block_number, log_index ASC`,
  [chainId, vault, topics])
  if(events.rows.length === 0) return []

  const result: `0x${string}`[] = []

  for (const event of events.rows) {
    switch (event.signature) {
      case topics[0]:
        result.push(zhexstring.parse(event.args.strategy))
        break
      case topics[1]:
        result.push(zhexstring.parse(event.args.newVersion))
        result.splice(result.indexOf(zhexstring.parse(event.args.oldVersion)), 1)
        break
      case topics[2]:
        result.splice(result.indexOf(zhexstring.parse(event.args.strategy)), 1)
        break
    }
  }

  return result
}

async function extractWithdrawalQueue(chainId: number, address: `0x${string}`) {
  const abi = parseAbi(['function withdrawalQueue(uint256) view returns (address)'])

  const multicall = await rpcs.next(chainId).multicall({ contracts: [
    { args: [0n], address, functionName: 'withdrawalQueue', abi },
    { args: [1n], address, functionName: 'withdrawalQueue', abi },
    { args: [2n], address, functionName: 'withdrawalQueue', abi },
    { args: [3n], address, functionName: 'withdrawalQueue', abi },
    { args: [4n], address, functionName: 'withdrawalQueue', abi },
    { args: [5n], address, functionName: 'withdrawalQueue', abi },
    { args: [6n], address, functionName: 'withdrawalQueue', abi },
    { args: [7n], address, functionName: 'withdrawalQueue', abi },
    { args: [8n], address, functionName: 'withdrawalQueue', abi },
    { args: [9n], address, functionName: 'withdrawalQueue', abi },
    { args: [10n], address, functionName: 'withdrawalQueue', abi },
    { args: [11n], address, functionName: 'withdrawalQueue', abi },
    { args: [12n], address, functionName: 'withdrawalQueue', abi },
    { args: [13n], address, functionName: 'withdrawalQueue', abi },
    { args: [14n], address, functionName: 'withdrawalQueue', abi },
    { args: [15n], address, functionName: 'withdrawalQueue', abi },
    { args: [16n], address, functionName: 'withdrawalQueue', abi },
    { args: [17n], address, functionName: 'withdrawalQueue', abi },
    { args: [18n], address, functionName: 'withdrawalQueue', abi },
    { args: [19n], address, functionName: 'withdrawalQueue', abi }
  ]})

  return multicall.filter(result => result.status === 'success' && result.result && result.result !== zeroAddress)
  .map(result => result.result as `0x${string}`)
}
