import { arbitrum, base, fantom, mainnet, optimism } from 'viem/chains'
import { parseAbi } from 'viem'
import { rpcs } from './rpcs'
import { cache } from './cache'

export const lens = {
  [mainnet.id]: '0x83d95e0D5f402511dB06817Aff3f9eA88224B030' as `0x${string}`,
  [optimism.id]: '0xB082d9f4734c535D9d80536F7E87a6f4F471bF65' as `0x${string}`,
  [fantom.id]: '0x57AA88A0810dfe3f9b71a9b179Dd8bF5F956C46A' as `0x${string}`,
  [base.id]: '0xE0F3D78DB7bC111996864A32d22AB0F59Ca5Fa86' as `0x${string}`,
  [arbitrum.id]: '0x043518AB266485dC085a1DB095B8d9C2Fc78E9b9' as `0x${string}`
}

export async function fetchErc20PriceUsd(chainId: number, token: `0x${string}`, blockNumber: bigint) {
  return cache.wrap(`fetchErc20PriceUsd:${chainId}:${token}:${blockNumber}`, async () => {
    return await __fetchErc20PriceUsd(chainId, token, blockNumber)
  }, 10_000)
}

async function __fetchErc20PriceUsd(chainId: number, token: `0x${string}`, blockNumber: bigint) {
  let price = await fetchLensPriceUsd(chainId, token, blockNumber)
  if(price !== 0) return { price, source: 'lens' }

  if(JSON.parse(process.env.YPRICE_ENABLED || 'false')) {
    price = await fetchYPriceUsd(chainId, token, blockNumber)
    if(price !== 0) return { price, source: 'yprice' }
  }

  console.warn('🚨', 'no price', chainId, token, blockNumber)  
  return { price: 0, source: 'none' }
}

async function fetchYPriceUsd(chainId: number, token: `0x${string}`, blockNumber: bigint) {
  if(!process.env.YPRICE_API) return 0

  try {
    const url = `${process.env.YPRICE_API}/get_price/${chainId}/${token}?block=${blockNumber}`
    const result = await fetch(url, {
      headers: {
        'X-Signature': process.env.YPRICE_API_X_SIGNATURE || '',
        'X-Signer': process.env.YPRICE_API_X_SIGNER || ''
      }
    })

    return Number(await result.json())

  } catch(error) {
    console.warn('🚨', 'yprice failed', chainId, token, blockNumber)
    console.warn()
    console.warn(error)
    console.warn()
    return 0
  }
}

async function fetchLensPriceUsd(chainId: number, token: `0x${string}`, blockNumber: bigint) {
  if(!(chainId in lens)) return 0
  try {
    const priceUSDC = await rpcs.next(chainId).readContract({
      address: lens[chainId as keyof typeof lens],
      functionName: 'getPriceUsdcRecommended' as never,
      args: [ token ],
      abi: parseAbi(['function getPriceUsdcRecommended(address tokenAddress) view returns (uint256)']),
      blockNumber
    }) as bigint
  
    return Number(priceUSDC * 10_000n / BigInt(10 ** 6)) / 10_000

  } catch(error) {
    console.warn('🚨', 'no lens price', chainId, token, blockNumber)
    return 0
  }
}
