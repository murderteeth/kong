import { inngest } from './client'
import { serve } from 'inngest/next'
import howdy from './howdy'
import prices from './etl/prices'

export const { GET, POST, PUT } = serve(inngest, [
  howdy,
  prices.etl
])
