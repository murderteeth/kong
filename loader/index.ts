import { types } from 'lib'
import pool from './pool'
import { BlockLoader } from './block'
import { VaultLoader } from './vault'

const loaders = [
  new BlockLoader(),
  new VaultLoader()
] as types.Processor[]

Promise.all([...
  loaders.map(loader => loader.up())
]).then(() => {
  console.log('🦍 loader up')
}).catch(error => {
  console.error('🤬', error)
  process.exit(1)
})

function down() {
  Promise.all([...
    loaders.map(loader => loader.down(),
    pool.end())
  ]).then(() => {
    console.log('🦍 loader down')
    process.exit(0)
  }).catch(error => {
    console.error('🤬', error)
    process.exit(1)
  })
}

process.on('SIGINT', down)
process.on('SIGTERM', down)
