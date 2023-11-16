import { getVaults } from '../../db'

export default async (_: any, args: { chainId?: number }) => {
  const { chainId } = args
  try {
    return await getVaults(
      'WHERE v.chain_id = $1 OR $1 IS NULL',
      'GROUP BY v.chain_id, v.address',
      [chainId]
    )
  } catch (error) {
    console.error(error)
    throw new Error('!vaults')
  }
}
