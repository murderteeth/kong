import dotenv from 'dotenv'
import { Inngest } from 'inngest'
dotenv.config({ path: '.env.development.local' })

const inngest = new Inngest({ name: 'Togusa' })

async function main() {
  console.log('say howdy..')
  await inngest.send({
    name: 'howdy',
    data: {}
  })
}

main()
