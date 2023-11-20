import * as yaml from 'js-yaml'
import * as fs from 'fs'
import path from 'path'

interface YamlConfig {
  crons: {
    name: string
    queue: string
    job: string
    schedule: string
    start?: boolean
  }[]
}

const yamlPath = path.join(__dirname, '../../config', 'crons.yaml')
const yamlFile = fs.readFileSync(yamlPath, 'utf8')
const config = yaml.load(yamlFile) as YamlConfig
export default config.crons
