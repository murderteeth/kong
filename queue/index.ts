import express from 'express'
import { Queue } from 'bullmq'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'

const port = process.env.PORT || 3001
const redisHost = process.env.REDIS_HOST || 'localhost'
const redisPort = (process.env.REDIS_PORT || 6379) as number

const blockQueue = new Queue('block', {
  connection: {
    host: redisHost, port: redisPort
  }
})

const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/')

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullMQAdapter(blockQueue)],
  serverAdapter: serverAdapter,
})

const app = express()

app.use('/', serverAdapter.getRouter())

app.listen(port, () => {
  console.log(`🐒 bullmq dashboard listening on ${port}`)
})

function shutdown() {
  blockQueue.close().then(() => {
    console.log('🐒 bullmq dashboard down')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
