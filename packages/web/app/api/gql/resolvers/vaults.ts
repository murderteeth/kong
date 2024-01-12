import { getVaults } from '../../db'

const vaults = async (_: any, args: { chainId?: number }) => {
  const { chainId } = args
  try {
    return await getVaults(
      'WHERE v.chain_id = $1 OR $1 IS NULL',
      [chainId]
    )
  } catch (error) {
    console.error(error)
    throw new Error('!vaults')
  }
}

export default vaults
