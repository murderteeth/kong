import db from '@/app/api/db'

const strategies = async (_: any, args: { chainId?: number }) => {
  const { chainId } = args
  try {

    const result = await db.query(`
    SELECT 
      thing.chain_id,
      thing.address,
      snapshot.snapshot,
      snapshot.hook
    FROM thing
    JOIN snapshot 
      ON thing.chain_id = snapshot.chain_id
      AND thing.address = snapshot.address
    WHERE thing.label = $1 AND (thing.chain_id = $2 OR $2 IS NULL)
    ORDER BY snapshot.hook->>'totalDebtUsd' DESC`, 
    ['strategy', chainId])

    return result.rows.map(row => ({
      chainId: row.chain_id,
      address: row.address,
      ...row.snapshot,
      ...row.hook
    }))

  } catch (error) {
    console.error(error)
    throw new Error('!strategies')
  }
}

export default strategies
