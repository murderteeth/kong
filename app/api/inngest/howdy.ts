import { inngest } from './client'
import { sql } from '@vercel/postgres'

const howdy = inngest.createFunction(
  { name: 'Howdy' },
  { event: 'howdy' },
  async ({ event }) => {
    const timestamp_sent = new Date(event.data.now)
    if (isNaN(timestamp_sent.getTime())) throw new Error('Invalid timestamp')

    await sql`
    INSERT INTO howdy (timestamp_sent) 
    VALUES (${timestamp_sent.toISOString()});`

    return '🤠 Howdy !!'
  }
)

export default howdy