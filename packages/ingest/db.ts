import { Pool } from 'pg'

const db = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: (process.env.POSTGRES_PORT || 5432) as number,
  database: process.env.POSTGRES_DATABASE || 'user',
  user: process.env.POSTGRES_USER || 'user',
  password: process.env.POSTGRES_PASSWORD || 'password',
  max: 40,
  idleTimeoutMillis: 30_000,
})

export default db

export const camelToSnake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

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

export async function saveBlockPointer(chainId: number, address: `0x${string}`, blockNumber: bigint) {
  await db.query(`
    INSERT INTO public.block_pointer (chain_id, address, block_number)
    VALUES ($1, $2, $3)
    ON CONFLICT (chain_id, address)
    DO UPDATE SET
      block_number = EXCLUDED.block_number,
      updated_at = NOW();
  `, [chainId, address, blockNumber])
}

export async function getErc20(chainId: number, address: string) {
  const result = await db.query(`
    SELECT 
      address,
      name,
      symbol,
      decimals
    FROM erc20
    WHERE chain_id = $1 AND address = $2
  `, [chainId, address])
  return result.rows[0] as {
    address: `0x${string}`, 
    name: string,
    symbol: string,
    decimals: number
  }
}

export function toUpsertQuery(table: string, pk: string, update: any) {
  const fields = Object.keys(update).map(key => 
    camelToSnake(key)
  ) as string[]

  const columns = fields.join(', ')

  const values = fields.map((field, index) => 
    field.endsWith('_timestamp') 
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
      ${updates};
  `
}

export function toUpsertIfAsOfQuery(table: string, pk: string, update: any) {
  const fields = Object.keys(update).map(key => 
    camelToSnake(key)
  ) as string[]

  const columns = fields.join(', ')

  const values = fields.map((field, index) => 
    field.endsWith('_timestamp') 
    ? `to_timestamp($${index + 1}::double precision)`
    : `$${index + 1}`
  ).join(', ')
  const updates = fields.map(field => `${field} = EXCLUDED.${field}`).join(', ')

  return `
    INSERT INTO ${table} (${columns}, updated_at)
    VALUES (${values}, NOW())
    ON CONFLICT (${pk})
    DO UPDATE SET 
      ${updates},
      updated_at = NOW()
    WHERE ${table}.as_of_block_number < EXCLUDED.as_of_block_number;
  `
}
