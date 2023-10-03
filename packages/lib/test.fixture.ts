import path from 'path'
import dotenv from 'dotenv'
import { rpcs } from './rpcs'
import { cache } from './cache'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

export const mochaGlobalSetup = async function() {
  await rpcs.up()
  await cache.up()
  console.log('⬆', 'test fixture up')
}

export const mochaGlobalTeardown = async () => {
  await cache.down()
  await rpcs.down()
  console.log('⬇', 'test fixture down')
}
