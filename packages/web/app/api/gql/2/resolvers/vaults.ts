import db from '@/app/api/db'

const vaults = async (_: any, args: { chainId?: number }) => {
  const { chainId } = args
  try {

    const result = await db.query(`
      SELECT 
        thing.chain_id as "chainId",
        thing.address, 
        thing.defaults->'apiVersion' as "apiVersion",
        thing.defaults->'registry' as registry,
        thing.defaults->'inceptBlock' as "inceptBlockNumber",
        thing.defaults->'inceptTime' as "inceptBlockTime",
        snapshot.snapshot->>'name' as name
      FROM thing
      JOIN snapshot 
        ON thing.chain_id = snapshot.chain_id
        AND thing.address = snapshot.address
      WHERE thing.label = $1 AND (thing.chain_id = $2 OR $2 IS NULL)`, 
      ['vault', chainId])

    return result.rows

  } catch (error) {
    console.error(error)
    throw new Error('!vaults')
  }
}

export default vaults
