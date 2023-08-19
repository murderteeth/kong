import path from 'path'
import dotenv from 'dotenv'
import { BlockWatcher } from './block/watcher'
import { BlockLoader } from './block/loader'
import { Processor, ProcessorPool } from './processor'
import { RegistryWatcher } from './yearn/registry/watcher'
import { RegistryExtractor } from './yearn/registry/extractor'
import { VaultExtractor } from './yearn/vault/extractor'
import { VaultLoader } from './yearn/vault/loader'

const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })



const processors = [
  new ProcessorPool<BlockWatcher>(BlockWatcher, 1),
  new ProcessorPool<BlockLoader>(BlockLoader, 1),
  new ProcessorPool<RegistryWatcher>(RegistryWatcher, 1),
  new ProcessorPool<RegistryExtractor>(RegistryExtractor, 1),
  new ProcessorPool<VaultExtractor>(VaultExtractor, 1),
  new ProcessorPool<VaultLoader>(VaultLoader, 1)
] as Processor[]



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
