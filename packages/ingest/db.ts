import { strings, types } from 'lib'
import { Pool, types as pgTypes } from 'pg'

// Convert numeric (OID 1700) to float
pgTypes.setTypeParser(1700, 'text', parseFloat)

// Convert bigtin (OID 20) to BigInt
pgTypes.setTypeParser(20, BigInt)

// Convert timestamptz (OID 1184) to seconds
pgTypes.setTypeParser(1184, (stringValue) => {
  return BigInt(Math.floor(Date.parse(stringValue) / 1000))
})

const db = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: (process.env.POSTGRES_PORT || 5432) as number,
  ssl: (process.env.POSTGRES_SSL || false) as boolean,
  database: process.env.POSTGRES_DATABASE || 'user',
  user: process.env.POSTGRES_USER || 'user',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 40,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 60_000,
})

export default db

export async function firstRow(query: string, params: any[] = [], ) {
  const result = await db.query(query, params)
  return result.rows[0]
}

export async function getLatestBlock(chainId: number) {
  const result = await db.query(`
    SELECT block_number
    FROM latest_block
    WHERE chain_id = $1
  `, [chainId])
  return (result.rows[0]?.block_number || 0) as bigint
}

export async function getBlockPointer(chainId: number, address: `0x${string}`) {
  const result = await db.query(`
    SELECT block_number
    FROM block_pointer
    WHERE chain_id = $1 AND address = $2
  `, [chainId, address])
  return BigInt(result.rows[0]?.block_number || 0) as bigint
}

export async function setBlockPointer(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  await db.query(`
    INSERT INTO public.block_pointer (chain_id, address, block_number)
    VALUES ($1, $2, $3)
    ON CONFLICT (chain_id, address)
    DO UPDATE SET
      block_number = EXCLUDED.block_number;
  `, [chainId, address, blockNumber])
}

export async function getVaultBlockPointers(chainId: number) {
  const result = await db.query(`
    SELECT 
      v.address, 
      COALESCE(v.activation_block_number, 0) AS "activationBlockNumber",
      COALESCE(p.block_number, 0) AS "blockNumber"
    FROM vault v
    LEFT JOIN block_pointer p
    ON v.chain_id = p.chain_id AND v.address = p.address
    WHERE v.chain_id = $1;
  `, [chainId])
  return result.rows.map(r => ({
    address: r.address,
    activationBlockNumber: BigInt(r.activationBlockNumber),
    blockNumber: BigInt(r.blockNumber)
  }))
}

export async function getErc20(chainId: number, address: string) {
  const result = await db.query(`
    SELECT 
      address,
      name,
      symbol,
      decimals
    FROM erc20
    WHERE chain_id = $1 AND address = $2;
  `, [chainId, address])
  return result.rows[0] as {
    address: `0x${string}`, 
    name: string,
    symbol: string,
    decimals: number
  }
}

export async function getSparkline(chainId: number, address: string, type: string) {
  const result = await db.query(`
    SELECT
      chain_id as "chainId", address, type, value,
      FLOOR(EXTRACT(EPOCH FROM time)) AS time
    FROM sparkline
    WHERE chain_id = $1 AND address = $2 AND type = $3
    ORDER BY time ASC;
  `, [chainId, address, type])
  return result.rows as types.SparklinePoint[]
}

export function toUpsertSql(table: string, pk: string, data: any, where?: string) {
  const fields = Object.keys(data).map(key => 
    strings.camelToSnake(key)
  ) as string[]

  const columns = fields.join(', ')

  const values = fields.map((field, index) => 
    (field.endsWith('timestamp') || field.endsWith('time')) 
    ? `to_timestamp($${index + 1}::double precision)`
    : `$${index + 1}`
  ).join(', ')

  const updates = fields.map(field => 
    `${field} = EXCLUDED.${field}`
  ).join(', ')

  return `
    INSERT INTO ${table} (${columns})
    VALUES (${values})
    ON CONFLICT (${pk})
    DO UPDATE SET 
      ${updates}
    ${where || ''};
  `
}
