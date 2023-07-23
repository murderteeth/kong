import { inngest } from '../../client'
import { oracleABI } from '../../../../../.generated/wagmi'
import { createPublicClient, http, getContract } from 'viem'
import { mainnet } from 'viem/chains'
import { sql } from '@vercel/postgres'
import Big from 'big.js'

const tokens = [
  {
    symbol: 'WETH',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`
  }
]

const etl = inngest.createFunction(
  { name: 'ETL Prices' },
  { cron: 'TZ=Pacific/Honolulu */15 * * * *' },
  async () => {

    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    })

    const oracle = getContract({
      address: '0x9b8b9F6146B29CC32208f42b995E70F0Eb2807F3',
      abi: oracleABI,
      publicClient
    })

    for(const token of tokens) {
      const blockNumber = await publicClient.getBlockNumber()
      const block = await publicClient.getBlock({ blockNumber })
      const price = await oracle.read.getPriceUsdcRecommended([token.address], { blockNumber })
      const adjusted = Big(price.toString()).div(Big((10 ** 6).toString()))
      await sql`
      INSERT INTO price (network, address, symbol, price_usd, block_height, block_timestamp)
      VALUES (1, ${token.address}, ${token.symbol}, ${adjusted.toString()}, ${blockNumber.toString()}, to_timestamp(${block.timestamp.toString()}))
      ON CONFLICT (network, address, block_height)
      DO UPDATE 
      SET 
        price_usd = EXCLUDED.price_usd,
        block_timestamp = EXCLUDED.block_timestamp,
        symbol = EXCLUDED.symbol;
      `
    }
  }
)

const prices = { etl }
export default prices
