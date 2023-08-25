import { types } from 'lib'
import { blocks } from 'lib'
import { PublicClient, parseAbi } from 'viem'

export async function extractState(rpc: PublicClient, vault: types.Vault) {
  const result = await rpc.multicall({
    contracts: [
      {
        address: vault.address,
        abi: parseAbi(['function name() returns (string)']),
        functionName: 'name'
      },
      {
        address: vault.address,
        abi: parseAbi(['function symbol() returns (string)']),
        functionName: 'symbol'
      },
      {
        address: vault.address,
        abi: parseAbi(['function decimals() returns (uint32)']),
        functionName: 'decimals'
      },
      {
        address: vault.address,
        abi: parseAbi(['function totalAssets() returns (uint256)']),
        functionName: 'totalAssets'
      },
      {
        address: vault.assetAddress,
        abi: parseAbi(['function name() returns (string)']),
        functionName: 'name'
      },
      {
        address: vault.assetAddress,
        abi: parseAbi(['function symbol() returns (string)']),
        functionName: 'symbol'
      },
      {
        address: vault.address,
        abi: parseAbi(['function apiVersion() returns (string)']),
        functionName: 'apiVersion'
      },
      {
        address: vault.address,
        abi: parseAbi(['function activation() returns (uint256)']),
        functionName: 'activation'
      }
    ]
  })

  const activation = result[7].result
  let activationBlockNumber = (activation && activation > 0n) 
  ? await blocks.estimateHeight(rpc as PublicClient, Number(activation)) 
  : 0n

  return {
    ...vault,
    name: result[0].result,
    symbol: result[1].result,
    decimals: result[2].result,
    totalAssets: result[3].result?.toString(),
    assetName: result[4].result,
    assetSymbol: result[5].result,
    apiVersion: result[6].result || '0.0.0',
    activationTimestamp: activation?.toString(),
    activationBlockNumber: activationBlockNumber.toString(),
    asOfBlockNumber: (await rpc.getBlockNumber()).toString()
  } as types.Vault
}
