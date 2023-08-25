import path from 'path'
import dotenv from 'dotenv'
import { BlockWatcher } from './block/watcher'
import { BlockLoader } from './block/loader'
import { Processor, ProcessorPool } from './processor'
import { rpcs } from './rpcs'
import { YearnRegistryWatcher } from './yearn/registry/watcher'
import { YearnVaultLoader } from './yearn/vault/loader'
import { YearnIndexer } from './yearn/indexer'
import { YearnRegistryExtractor } from './yearn/registry/extractor'
import { YearnVaultExtractor } from './yearn/vault/extractor'
import { YearnRegistryBlockPointer } from './yearn/registry/blockPointer'
import { YearnVaultBlockPointer } from './yearn/vault/blockPointer'

const envPath = path.join(__dirname, '..', '.env')
dotenv.config({ path: envPath })



rpcs.up()
const processors = [
  new ProcessorPool<BlockWatcher>(BlockWatcher, 2),
  new ProcessorPool<BlockLoader>(BlockLoader, 2),
  new ProcessorPool<YearnIndexer>(YearnIndexer, 4),
  new ProcessorPool<YearnRegistryExtractor>(YearnRegistryExtractor, 4),
  new ProcessorPool<YearnRegistryWatcher>(YearnRegistryWatcher, 2),
  new ProcessorPool<YearnRegistryBlockPointer>(YearnRegistryBlockPointer, 2),
  new ProcessorPool<YearnVaultExtractor>(YearnVaultExtractor, 4),
  new ProcessorPool<YearnVaultLoader>(YearnVaultLoader, 2),
  new ProcessorPool<YearnVaultBlockPointer>(YearnVaultBlockPointer, 2),
] as Processor[]



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
