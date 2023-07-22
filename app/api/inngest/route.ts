import { Inngest } from 'inngest'
import { serve } from 'inngest/next'

const inngest = new Inngest({ name: 'Togusa' })

const howdy = inngest.createFunction(
  { name: 'Howdy' },
  { event: 'howdy' },
  async ({ event }) => {
    return '🤠 Howdy !!'
  }
)

export const { GET, POST, PUT } = serve(inngest, [howdy])
