import { z } from 'zod'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import path from 'path'
import { ThingSchema } from './types'

const YamlConfigSchema = z.object({
  manuals: z.array(ThingSchema)
})

const yamlPath = (() => {
  const local = path.join(__dirname, '../../config', 'manuals.local.yaml')
  const production = path.join(__dirname, '../../config', 'manuals.yaml')
  if(fs.existsSync(local)) return local
  return production
})()

const yamlFile = fs.readFileSync(yamlPath, 'utf8')
const config = YamlConfigSchema.parse(yaml.load(yamlFile))
const { manuals } = config
export default manuals
