import { mainnet } from 'viem/chains'
import { PublicClient, parseAbi } from 'viem'

export const oracles = {
  [mainnet.id]: '0x9b8b9F6146B29CC32208f42b995E70F0Eb2807F3' as `0x${string}`
}

export async function fetchErc20PriceUsd(rpc: PublicClient, token: `0x${string}`, blockNumber: bigint) {
  let price = await fetchOraclePriceUsd(rpc, token, blockNumber)
  if(price !== null) return price

  price = await fetchMagicPriceUsd(rpc, token, blockNumber)
  if(price !== null) return price

  console.warn('🚨', 'no price', rpc.chain?.id, token, blockNumber)  
  return 0
}

async function fetchMagicPriceUsd(rpc: PublicClient, token: `0x${string}`, blockNumber: bigint) {
  if(!process.env.YPRICE_API) return null

  try {
    const url = `${process.env.YPRICE_API}/get_price/1/${token}?block=${blockNumber}`
    const result = await fetch(url, {
      headers: {
        'X-Signature': process.env.YPRICE_API_X_SIGNATURE || '',
        'X-Signer': process.env.YPRICE_API_X_SIGNER || ''
      }
    })

    return Number(await result.text())

  } catch(error) {
    console.warn('🚨', 'no magic price', rpc.chain?.id, token, blockNumber)
    return null
  }
}

async function fetchOraclePriceUsd(rpc: PublicClient, token: `0x${string}`, blockNumber: bigint) {
  if(!(rpc.chain?.id && rpc.chain?.id in oracles)) {
    return null
  }

  try {
    const priceUSDC = await rpc.readContract({
      address: oracles[rpc.chain?.id as keyof typeof oracles],
      functionName: 'getPriceUsdcRecommended' as never,
      args: [ token ],
      abi: parseAbi(['function getPriceUsdcRecommended(address tokenAddress) view returns (uint256)']),
      blockNumber
    }) as bigint
  
    return Number(priceUSDC * 10_000n / BigInt(10 ** 6)) / 10_000

  } catch(error) {
    console.warn('🚨', 'no oracle price', rpc.chain.id, token, blockNumber)
    return null
  }
}
