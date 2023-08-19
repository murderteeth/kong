import path from 'path'
import dotenv from 'dotenv'
import { types } from 'lib'
import { BlockWatcher } from './block/watcher'
import { BlockLoader } from './block/loader'
import { ProcessorPool } from './processor'

const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })

const processors = [
  new ProcessorPool<BlockWatcher>(BlockWatcher, 1),
  new ProcessorPool<BlockLoader>(BlockLoader, 1)
] as types.Processor[]

Promise.all([...
  processors.map(process => process.up()),
]).then(() => {
  console.log('🦍 ingest up')
}).catch(error => {
  console.error('🤬', error)
  process.exit(1)
})

function down() {
  Promise.all([...
    processors.map(process => process.down())
  ]).then(() => {
    console.log('🦍 ingest down')
    process.exit(0)
  }).catch(error => {
    console.error('🤬', error)
    process.exit(1)
  })
}

process.on('SIGINT', down)
process.on('SIGTERM', down)
