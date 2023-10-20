require('lib/json.monketpatch')
import path from 'path'
import dotenv from 'dotenv'
import { rpcs } from 'lib/rpcs'
import { Processor, ProcessorPool } from 'lib/processor'
import { cache, mq } from 'lib'
import db from './db'
import processorConfig, { toCamelPath } from './processors'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

const processorpools = processorConfig.processors.map(p => {
  const path = `./${toCamelPath(p.name)}`
  const ProcessorClass = require(path).default
  console.log('⬆', 'processor up', path)
  return new ProcessorPool(ProcessorClass, 2, processorConfig.recycleMs)
}) as Processor[]

function up() {
  rpcs.up()
  Promise.all([
    cache.up(),
    ...processorpools.map(pool => pool.up())
  ]).then(() => {
  
    console.log('🐒 ingest up')
  
  }).catch(error => {
    console.error('🤬', error)
    process.exit(1)
  })
}

function down() {
  Promise.all([
    ...processorpools.map(pool => pool.down()),
    rpcs.down(),
    cache.down(),
    db.end()
  ]).then(() => {
    console.log('🐒 ingest down')
    process.exit(0)
  }).catch(error => {
    console.error('🤬', error)
    process.exit(1)
  })
}

up()
process.on('SIGINT', down)
process.on('SIGTERM', down)
