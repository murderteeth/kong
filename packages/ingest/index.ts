import path from 'path'
import dotenv from 'dotenv'
import { rpcs } from 'lib/rpcs'
import { Processor, ProcessorPool } from 'lib/processor'
import config, { toCamelPath } from './config'
import { mq } from 'lib'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

rpcs.up()

const processors = config.processorPools.filter(p => p.size > 0).map(p => {
  const path = `./${toCamelPath(p.type)}`
  const ProcessorClass = require(path).default
  console.log('⬆', 'processor up', p.size, path)
  return new ProcessorPool(ProcessorClass, p.size, config.processRecycleMs)
}) as Processor[]

const crons = config.crons.map(cron => new Promise((resolve, reject) => {
  const queue = mq.queue(cron.queue)
  queue.add(cron.job || mq.q.noJobName, {}, {
    repeat: { pattern: cron.schedule },
  }).then(() => {
    console.log('⬆', 'cron up', cron.name)
    queue.close().then(resolve).catch(reject)
  })
}))

Promise.all([...
  processors.map(process => process.up()),
]).then(() => {
  Promise.all(crons).then(() => {

    console.log('🐒 ingest up')

  }).catch(error => {
    console.error('🤬', error)
    process.exit(1)    
  })
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
