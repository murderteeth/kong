import { z } from 'zod'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import path from 'path'
import { EvmAddressSchema } from './types'

const YamlConfigSchema = z.object({
  events: z.object({
    ignore: z.array(z.string()),
    limit: z.array(z.string())
  }),
  addresses: z.array(z.object({
    chainId: z.number(),
    address: EvmAddressSchema
  }))
})

const yamlPath = (() => {
  const local = path.join(__dirname, '../../config', 'blacklist.local.yaml')
  const production = path.join(__dirname, '../../config', 'blacklist.yaml')
  if(fs.existsSync(local)) return local
  return production
})()

const yamlFile = fs.readFileSync(yamlPath, 'utf8')
const blacklist = YamlConfigSchema.parse(yaml.load(yamlFile))
export default blacklist
