import * as yaml from 'js-yaml'
import * as fs from 'fs'

export interface YamlConfig {
  pollMs: number
  processRecycleMs: number
  processors: {
    name: string
    poolSize: number
  }[]
}

export const toCamelPath = (str: string) => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1/$2').toLowerCase()
}

const yamlFile = fs.readFileSync('./config.yaml', 'utf8')
const config = yaml.load(yamlFile) as YamlConfig
export default config
