import { inngest } from '../../client'

const extract = inngest.createFunction(
  { name: 'Extract Prices' },
  { event: 'etl.prices.extract' },
  async ({ event }) => {
    return '🤠 Howdy !!'
  }
)

export default { extract }