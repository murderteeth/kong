import { inngest } from './client'
import { serve } from 'inngest/next'
import howdy from './howdy'

export const { GET, POST, PUT } = serve(inngest, [
  howdy
])
