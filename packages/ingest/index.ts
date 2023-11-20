require('lib/json.monkeypatch')
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { rpcs } from 'lib/rpcs'
import { Processor, ProcessorPool } from 'lib/processor'
import { cache, crons as cronsConfig, mq } from 'lib'
import db from './db'
import { camelToSnake } from 'lib/strings'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

const exportsProcessor = (filePath: string): boolean => {
  const fileContent = fs.readFileSync(filePath, 'utf8')
  const regex = /export default class \S+ implements Processor/
  return regex.test(fileContent)
}

const pools = fs.readdirSync(__dirname, { withFileTypes: true }).map(dirent => {
  const tenMinutes = 10 * 60 * 1000
  if (dirent.isDirectory()) {
    const indexPath = path.join(__dirname, dirent.name, 'index.ts')
    if (fs.existsSync(indexPath) && exportsProcessor(indexPath)) {
      console.log('⬆', 'processor up', dirent.name)
      const ProcessorClass = require(indexPath).default
      return new ProcessorPool(ProcessorClass, 2, tenMinutes)
    }
  }
}).filter(p => p) as Processor[]

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
