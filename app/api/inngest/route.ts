import { inngest } from './client'
import { serve } from 'inngest/next'

const howdy = inngest.createFunction(
  { name: 'Howdy' },
  { event: 'howdy' },
  async ({ event }) => {
    return '🤠 Howdy !!'
  }
)

export const { GET, POST, PUT } = serve(inngest, [
  howdy
])
