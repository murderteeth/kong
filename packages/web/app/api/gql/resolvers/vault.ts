import { getVaults } from '../../db'

export default async (_: any, args: { chainId: number, address: string }) => {
  const { chainId, address } = args
  try {
    const result = await getVaults(
      'WHERE v.chain_id = $1 AND v.address = $2', 
      'GROUP BY v.chain_id, v.address',
      [chainId, address]
    )
    return result[0]
  } catch (error) {
    console.error(error)
    throw new Error('!vault')
  }
}
