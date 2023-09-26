import path from 'path'
import dotenv from 'dotenv'
import { rpcs } from 'lib/rpcs'
import { Processor, ProcessorPool } from 'lib/processor'
import config, { toCamelPath } from './config'
import { mq } from 'lib'
import db from './db'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

const processors = config.processorPools.filter(p => p.size > 0).map(p => {
  const path = `./${toCamelPath(p.type)}`
  const ProcessorClass = require(path).default
  console.log('⬆', 'processor up', p.size, `(${p.concurrency || 1})`, path)
  return new ProcessorPool(ProcessorClass, p.size, config.processRecycleMs)
}) as Processor[]

const crons = config.crons.map(cron => new Promise((resolve, reject) => {
  const queue = mq.queue(cron.queue)
  queue.add(cron.job || mq.q.__noJobName, {}, {
    repeat: { pattern: cron.schedule }
  }).then(() => {
    console.log('⬆', 'cron up', cron.name)
    queue.close().then(resolve).catch(reject)
  })
}))

up()

function up() {
  rpcs.up()
  Promise.all([
    ...processors.map(process => process.up()),
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
    ...processors.map(process => process.down()),
    rpcs.down(),
    db.end()
  ]).then(() => {
    console.log('🐒 ingest down')
    process.exit(0)
  }).catch(error => {
    console.error('🤬', error)
    process.exit(1)
  })
}

process.on('SIGINT', down)
process.on('SIGTERM', down)
