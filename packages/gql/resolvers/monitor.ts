import db from '../db'
import monitor from '../monitor'

export default async () => {
  try {
    const query = `
      SELECT 'databaseSize' as property, pg_database_size($1) as value
      UNION SELECT 'clients', count(*) FROM pg_stat_activity
      UNION SELECT 'vaultTableSize', pg_total_relation_size('vault')
      UNION SELECT 'strategyTableSize', pg_total_relation_size('strategy')
      UNION SELECT 'tvlTableSize', hypertable_size('tvl')
      UNION SELECT 'transferTableSize',  pg_total_relation_size('transfer')
      UNION SELECT 
        'cacheHitRate',
        ROUND(SUM(heap_blks_hit) / (SUM(heap_blks_hit) + SUM(heap_blks_read)), 4) AS value
      FROM 
        pg_statio_user_tables
      UNION SELECT 
        'indexHitRate',
        ROUND(SUM(idx_blks_hit) / (SUM(idx_blks_hit) + SUM(idx_blks_read)), 4)
      FROM 
        pg_statio_user_indexes;`
    const dbStatusRows = (await db.query(query, [process.env.POSTGRES_DATABASE || 'user'])).rows

    const dbStatus: { [key: string]: any } = {}
    for (const row of dbStatusRows) dbStatus[row.property] = row.value

    return {...await monitor.latest, db: dbStatus}
  } catch (error) {
    console.error(error)
    throw new Error('Failed to run monitor')
  }
}
