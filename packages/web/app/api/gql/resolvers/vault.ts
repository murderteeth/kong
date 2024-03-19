import { getVaults } from '../../db/getVaults'

const vault = async (_: any, args: { chainId: number, address: string }) => {
  const { chainId, address } = args
  try {
    const result = await getVaults(
      'WHERE (v.chain_id = $1 AND v.address = $2)',
      [chainId, address]
    )
    if(result.length === 0) return null
    return result[0]
  } catch (error) {
    console.error(error)
    throw new Error('!vault')
  }
}

export default vault
