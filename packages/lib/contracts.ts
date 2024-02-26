import { z } from 'zod'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import path from 'path'
import { keccak256, toBytes } from 'viem'
import { zhexstring } from './types'

export const SourceConfigSchema = z.object({
  chainId: z.number(),
  address: zhexstring,
  inceptBlock: z.bigint({ coerce: true })
})

export type SourceConfig = z.infer<typeof SourceConfigSchema>

const ThingFilterSchema = z.object({
  field: z.string(),
  op: z.string(),
  value: z.string()
})

const ThingsConfigSchema = z.object({
  label: z.string(),
  filter: ThingFilterSchema.array()
})

export type ThingsConfig = z.infer<typeof ThingsConfigSchema>

export const ContractSchema = z.object({
  abiPath: z.string(),
  schedule: z.string(),
  start: z.boolean().optional().default(false),
  fromIncept: z.boolean().optional().default(false),
  sources: SourceConfigSchema.array().optional().default([]),
  things: ThingsConfigSchema.optional(),
})

export type Contract = z.infer<typeof ContractSchema>

const YamlConfigSchema = z.object({
  contracts: z.array(ContractSchema)
})

const yamlPath = (() => {
  const local = path.join(__dirname, '../../config', 'contracts.local.yaml')
  const production = path.join(__dirname, '../../config', 'contracts.yaml')
  if(fs.existsSync(local)) return local
  return production
})()

const yamlFile = fs.readFileSync(yamlPath, 'utf8')
const config = YamlConfigSchema.parse(yaml.load(yamlFile))
const contracts = config.contracts.map(contract => ({
  ...contract,
  id: keccak256(toBytes(JSON.stringify(contract)))
}))

export { contracts }
export default contracts
