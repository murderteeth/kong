import { mq } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Errors', value: 'errors' }
} as MenuAction

async function getQueues() {
  const result = {} as { [key: string]: number }
  for(const queue of Object.keys(mq.q)) {
    const q = mq.queue(queue)
    result[queue] = (await q.getJobs('failed')).length
    await q.close()
  }
  return result
}

async function action() {
  const queues = await getQueues()
  const choices = Object.keys(queues).map(queue => ({
    title: `${queue} (${queues[queue]})`,
    value: queue
  }))

  const { queue } = await prompts([
    {
      type: 'select',
      name: 'queue',
      message: 'pick a queue',
      choices
    }
  ])

  const q = mq.queue(queue)
  const failed = await q.getJobs('failed')
  for(const job of failed) {
    console.log('------------------------')
    console.log(job.id)
    console.log(job.failedReason)
    console.log(job.stacktrace)
    console.log()
    console.log()
  }
  await q.close()

  
}
