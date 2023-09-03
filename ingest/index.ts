import path from 'path'
import dotenv from 'dotenv'
import * as yaml from 'js-yaml'
import * as fs from 'fs'
import { rpcs } from './rpcs'
import { Processor, ProcessorPool } from 'lib/processor'

const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })



interface ProcessorConfig {
  name: string
  poolSize: number
}

interface YamlData {
  processors: ProcessorConfig[]
}

const toCamelPath = (str: string) => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1/$2').toLowerCase()
}

const fileContents = fs.readFileSync('./processors.yaml', 'utf8')
const data = yaml.load(fileContents) as YamlData

rpcs.up()
const processors = data.processors.filter(p => p.poolSize > 0).map(p => {
  const path = `./${toCamelPath(p.name)}`
  const ProcessorClass = require(path).default
  console.log('⬆', 'processors up', p.poolSize, path)
  return new ProcessorPool(ProcessorClass, p.poolSize)
}) as Processor[]



Promise.all([...
  processors.map(process => process.up()),
]).then(() => {

  console.log('🐒 ingest up')

}).catch(error => {
  console.error('🤬', error)
  process.exit(1)
})

function down() {
  Promise.all([...
    processors.map(process => process.down())
  ]).then(() => {
    rpcs.down()
    console.log('🐒 ingest down')
    process.exit(0)
  }).catch(error => {
    console.error('🤬', error)
    process.exit(1)
  })
}

process.on('SIGINT', down)
process.on('SIGTERM', down)
