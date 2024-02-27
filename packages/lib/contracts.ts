import { z } from 'zod'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import path from 'path'
import { keccak256, toBytes } from 'viem'
import { zhexstring } from './types'

export const SourceConfigSchema = z.object({
  chainId: z.number(),
  address: zhexstring,
  inceptBlock: z.bigint({ coerce: true }),
  skip: z.boolean().optional().default(false),
  only: z.boolean().optional().default(false)
})

export type SourceConfig = z.infer<typeof SourceConfigSchema>

const ThingFilterSchema = z.object({
  field: z.string(),
  op: z.string(),
  value: z.string()
})

export const ThingsConfigSchema = z.object({
  label: z.string(),
  filter: ThingFilterSchema.array(),
  skip: z.boolean().optional().default(false),
  only: z.boolean().optional().default(false)
})

export type ThingsConfig = z.infer<typeof ThingsConfigSchema>

export const ContractSchema = z.object({
  abiPath: z.string(),
  schedule: z.string(),
  start: z.boolean().optional().default(false),
  fromIncept: z.boolean().optional().default(false),
  sources: SourceConfigSchema.array().optional().default([]),
  things: ThingsConfigSchema.optional(),
  skip: z.boolean().optional().default(false),
  only: z.boolean().optional().default(false)
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
const allContracts = config.contracts.map(contract => ({
  ...contract,
  id: keccak256(toBytes(JSON.stringify(contract)))
}))

const contracts = prune(allContracts)

export { contracts }
export default contracts

export function prune(contracts: Contract[]): Contract[] {
  const copy = ContractSchema.array().parse(JSON.parse(JSON.stringify(contracts)))
  const someSourceOnly = copy.some(contract => contract.sources.some(source => source.only))
  const someThingOnly = copy.some(contract => contract.things?.only)

  let result = copy.map(contract => ({
    ...contract,
    sources: contract.sources.filter(source => !source.skip && (contract.only || source.only || !(someSourceOnly || someThingOnly))),
    things: contract.things && !contract.things.skip && (contract.only || contract.things.only || !(someSourceOnly || someThingOnly))
    ? ({
      ...contract.things
    }) : undefined
  }))

  return result.filter(contract => 
    !contract.skip
    && (contract.sources.length > 0 || contract.things !== undefined)
    && (contract.only || contract.sources.some(source => source.only) || contract.things?.only || !copy.some(c => c.only))
  )
}
