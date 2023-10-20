import * as yaml from 'js-yaml'
import * as fs from 'fs'

export interface YamlConfig {
  recycleMs: number
  processors: {
    name: string
  }[]
}

export const toCamelPath = (str: string) => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1/$2').toLowerCase()
}

const yamlFile = fs.readFileSync('./processors.yaml', 'utf8')
const processorConfig = yaml.load(yamlFile) as YamlConfig
export default processorConfig
