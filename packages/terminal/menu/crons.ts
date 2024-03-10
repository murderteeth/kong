import { crons, mq, strings } from 'lib'
import prompts from 'prompts'
import { MenuAction } from '.'

export default {
  action,
  menu: { title: 'Crons', value: 'crons' }
} as MenuAction

async function action() {
  type choicetype = typeof crons.default[0] & { title: string, value: any, scheduled: boolean }
  const choices = [] as choicetype[]

  for(const cron of crons.default) {
    const q = mq.connect(cron.queue)
    const repeatables = await q.getRepeatableJobs()
    const scheduled = repeatables.some(job => job.name === cron.job)
    await q.close()
    choices.push({ 
      ...cron, 
      title: `${scheduled ? '🟢 enabled' : '🔴 disabled'} - ${cron.name} (${cron.schedule})`,
      value: cron.name,
      scheduled
    })
  }

  const { name, confirm } = await prompts([
    {
      type: 'select',
      name: 'name',
      message: 'pick a cron',
      choices: [...choices, { 
        name: 'all',
        job: 'all',
        queue: 'all',
        schedule: 'all',
        title: '*** toggle all cron ***', 
        value: 'all',
        scheduled: false
      }]
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (_, all) => `🤔 toggle ${all.name}?`,
    }
  ])

  if (confirm) {
    if(name === 'all') {
      if(choices.some(choice => choice.scheduled)) {
        for(const cron of choices.filter(c => c.scheduled)) {
          const q = mq.connect(cron.queue)
          await q.removeRepeatable(cron.job, { pattern: cron.schedule })
          await q.close()
          cron.scheduled = false
        }

      } else {
        for(const cron of choices) {
          const q = mq.connect(cron.queue)
          await q.add(cron.job, { id: strings.camelToSnake(cron.name) }, {
            repeat: { pattern: cron.schedule }
          })
          await q.close()
          cron.scheduled = true
        }

      }
    } else {
      const cron = choices.find(c => c.name === name)
      if(!cron) return

      if(cron.scheduled) {
        const q = mq.connect(cron.queue)
        await q.removeRepeatable(cron.job, { pattern: cron.schedule })
        await q.close()
        cron.scheduled = false

      } else {
        const q = mq.connect(cron.queue)
        await q.add(cron.job, { id: strings.camelToSnake(cron.name) }, {
          repeat: { pattern: cron.schedule }
        })
        await q.close()
        cron.scheduled = true
        console.log('⬆', 'cron up', cron.name)

      }
    }
  }
}
