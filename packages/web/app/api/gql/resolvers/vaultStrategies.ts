import db from '@/app/api/db'

const vaultStrategies = async (_: any, args: { chainId: number, vault: string }) => {
  const { chainId, vault } = args
  try {

    const result = await db.query(`
    SELECT 
      thing.chain_id,
      thing.address,
      thing.defaults,
      snapshot.snapshot,
      snapshot.hook
    FROM thing
    JOIN snapshot 
      ON thing.chain_id = snapshot.chain_id
      AND thing.address = snapshot.address
    WHERE thing.chain_id = $1
      AND thing.address = ANY(
        SELECT jsonb_array_elements_text(snapshot.hook->'strategies')
        FROM snapshot 
        WHERE chain_id = $1 AND address = $2
      ) AND (
        (COALESCE(thing.defaults->>'yearn', 'false')::boolean = true AND thing.label = 'strategy')
        OR (COALESCE(thing.defaults->>'yearn', 'false')::boolean = false AND thing.label = 'vault')
      )
    ORDER BY snapshot.hook->>'totalDebtUsd' DESC`,
    [chainId, vault])

    return result.rows.map(row => ({
      chainId: row.chain_id,
      address: row.address,
      ...row.defaults,
      ...row.snapshot,
      ...row.hook
    }))

  } catch (error) {
    console.error(error)
    throw new Error('!vaultStrategies')
  }
}

export default vaultStrategies
