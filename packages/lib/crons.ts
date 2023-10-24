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

const yamlFile = fs.readFileSync(path.join(__dirname, 'crons.yaml'), 'utf8')
const config = yaml.load(yamlFile) as YamlConfig
export default config.crons
