import path from 'path'
import dotenv from 'dotenv'
import { BlockWatcher } from './evm/block'
import { RegistryWatcher, RegistryWorker } from './evm/yv2/registry'
import { types } from 'lib'
import { VaultWorker } from './evm/yv2/vault'

const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })

const watchers = [
  new BlockWatcher(),
  new RegistryWatcher()
] as types.Processor[]

const workers = [
  new RegistryWorker(),
  new VaultWorker()
] as types.Processor[]

Promise.all([...
  watchers.map(watcher => watcher.up()),
  workers.map(worker => worker.up())
]).then(() => {
  console.log('🦍 extractor up')
}).catch(error => {
  console.error('🤬', error)
  process.exit(1)
})

function down() {
  Promise.all([...
    watchers.map(watcher => watcher.down()),
    workers.map(worker => worker.down())
  ]).then(() => {
    console.log('🦍 extractor down')
    process.exit(0)
  }).catch(error => {
    console.error('🤬', error)
    process.exit(1)
  })
}

process.on('SIGINT', down)
process.on('SIGTERM', down)
