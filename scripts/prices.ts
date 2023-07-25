import dotenv from 'dotenv'
import { Inngest } from 'inngest'
dotenv.config({ path: '.env.development.local' })

const inngest = new Inngest({ name: 'Kong' })

async function main() {
  await inngest.send({
    name: 'etl.prices',
    data: {}
  })
  console.log('🤠 Howdy !!')
}

main()