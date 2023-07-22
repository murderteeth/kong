import { Inngest } from 'inngest'
import { serve } from 'inngest/next'

export const inngest = new Inngest({ name: 'Togusa' })

const howdy = inngest.createFunction(
  { name: 'Howdy' },
  { event: 'howdy' },
  async ({ event }) => {
    return '🤠 Howdy !!'
  }
)

export default serve(inngest, [howdy])
