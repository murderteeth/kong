import { z } from 'zod'
import { strings, types } from 'lib'
import { StrideSchema } from 'lib/types'
import { Pool, PoolClient, types as pgTypes } from 'pg'
import { snakeToCamelCols, snakeToCamel } from 'lib/strings'

// Convert numeric (OID 1700) to float
pgTypes.setTypeParser(1700, 'text', parseFloat)

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

export async function query<T>(schema: z.ZodType<T>, sql: string, params: any[] = []) {
  return await _query<T>(schema)(sql, params)
}

export async function first<T>(schema: z.ZodType<T>, sql: string, params: any[] = []) {
  return (await _query<T>(schema)(sql, params))[0]
}

function _query<T>(schema: z.ZodType<T>) {
  return async function(sql: string, values: any[]) {
    const rows = (await db.query(sql, values)).rows
    const rowsInCamelCase = snakeToCamelCols(rows)
    return schema.array().parse(rowsInCamelCase)
  }
}

export async function some(query: string, params: any[] = [], client?: PoolClient) {
  const result = await (client ?? db).query(query, params)
  return result.rows.length > 0
}

export async function firstRow(query: string, params: any[] = [], client?: PoolClient) {
  const result = await (client ?? db).query(query, params)
  return result.rows[0]
}

export async function firstValue<T>(query: string, params: any[] = [], client?: PoolClient): Promise<T | undefined> {
  const result = await (client ?? db).query(query, params)
  return result.rows[0] ? result.rows[0][Object.keys(result.rows[0])[0]] as T : undefined
}

export async function getTravelledStrides(chainId: number, address: `0x${string}`, client?: PoolClient) {
  const result = await (client ?? db).query(
    `SELECT strides FROM evmlog_strides WHERE chain_id = $1 AND address = $2 ${client ? 'FOR UPDATE' : ''};`,
    [chainId, address]
  )
  const stridesJson = result.rows[0]?.strides
  return stridesJson ? StrideSchema.array().parse(JSON.parse(stridesJson)) : undefined
}

export async function getSparkline(chainId: number, address: string, label: string, component?: string) {
  const result = await db.query(`
    SELECT
      CAST($1 AS int4) AS "chainId",
      CAST($2 AS text) AS address,
      CAST($3 AS text) AS label,
      CAST($4 AS text) AS component,
      time_bucket(CAST('7 day' AS interval), block_time) AS "blockTime",
      LAST(value, block_time) AS close
    FROM output
    WHERE chain_id = $1 AND address = $2 AND label = $3 AND (component = $4 OR $4 IS NULL)
    GROUP BY "blockTime"
    ORDER BY "blockTime" DESC
    LIMIT 3;
  `, [chainId, address, label, component])
  return z.object({
    chainId: z.number(),
    address: z.string(),
    label: z.string(),
    component: z.string().nullish(),
    blockTime: z.bigint({ coerce: true }),
    close: z.number()
  }).array().parse(result.rows).reverse()
}

export function toUpsertSql(table: string, pk: string, data: any, where?: string) {
  const timestampConversionExceptions = [ 'profit_max_unlock_time' ]

  const fields = Object.keys(data).map(key => 
    strings.camelToSnake(key)
  ) as string[]

  const columns = fields.join(', ')

  const values = fields.map((field, index) => 
    (field.endsWith('timestamp') || field.endsWith('time') && !timestampConversionExceptions.includes(field)) 
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
