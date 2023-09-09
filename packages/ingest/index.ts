import path from 'path'
import dotenv from 'dotenv'
import { rpcs } from './rpcs'
import { Processor, ProcessorPool } from 'lib/processor'
import config, { toCamelPath } from './config'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })



rpcs.up()
const processors = config.processors.filter(p => p.poolSize > 0).map(p => {
  const path = `./${toCamelPath(p.name)}`
  const ProcessorClass = require(path).default
  console.log('⬆', 'processor up', p.poolSize, path)
  return new ProcessorPool(ProcessorClass, p.poolSize, config.processRecycleMs)
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
