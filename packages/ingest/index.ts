require('lib/json.monketpatch')
import path from 'path'
import dotenv from 'dotenv'
import { rpcs } from 'lib/rpcs'
import { Processor, ProcessorPool } from 'lib/processor'
import { cache, crons as cronsConfig, mq } from 'lib'
import db from './db'
import processorConfig, { toCamelPath } from './processors'
import { camelToSnake } from 'lib/strings'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

const pools = processorConfig.processors.map(p => {
  const path = `./${toCamelPath(p.name)}`
  const ProcessorClass = require(path).default
  console.log('⬆', 'processor up', path)
  return new ProcessorPool(ProcessorClass, 2, processorConfig.recycleMs)
}) as Processor[]

const crons = cronsConfig.default
.filter(cron => cron.start)
.map(cron => new Promise((resolve, reject) => {
  const queue = mq.queue(cron.queue)
  queue.add(cron.job, { id: camelToSnake(cron.name) }, {
    repeat: { pattern: cron.schedule }
  }).then(() => {
    console.log('⬆', 'cron up', cron.name)
    queue.close().then(resolve).catch(reject)
  })
}))

function up() {
  rpcs.up()
  Promise.all([
    cache.up(),
    ...pools.map(pool => pool.up()),
    ...crons
  ]).then(() => {
  
    console.log('🐒 ingest up')
  
  }).catch(error => {
    console.error('🤬', error)
    process.exit(1)
  })
}

function down() {
  Promise.all([
    ...pools.map(pool => pool.down()),
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
