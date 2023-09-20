import path from 'path'
import dotenv from 'dotenv'
import { rpcs } from './rpcs'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

export const mochaGlobalSetup = async function() {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0' // TODO: remove this after price magic sorts out its dns
  await rpcs.up()
  console.log('⬆', 'rpcs up')
}

export const mochaGlobalTeardown = async () => {
  await rpcs.down()
  console.log('⬇', 'rpcs down')
}
