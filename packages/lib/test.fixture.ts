import path from 'path'
import dotenv from 'dotenv'
import { rpcs } from './rpcs'

const envPath = path.join(__dirname, '../..', '.env')
dotenv.config({ path: envPath })

export const mochaGlobalSetup = async function() {
  await rpcs.up()
  console.log('⬆', 'rpcs up')
}

export const mochaGlobalTeardown = async () => {
  await rpcs.down()
  console.log('⬇', 'rpcs down')
}
